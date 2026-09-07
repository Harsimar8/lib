import { IDataReceiver, IDataSender } from "./DataHandler";
import { DLOG, Logger, LogLevel } from "./Logger";
import { WebRTCSignalar } from "./WebRTCSignalar";

export class ResolveReject {
    resolve(value: any): void {}
    reject(value: any): void {}
}
export class ChunkedMessageHandler {
    private numChunks: number = 0;
    private totalSize: number = 0;
    private filledSize: number = 0;
    private chunkHeaderSize: number = 12;
    private buffer: Uint8Array;
    private static handlers: {[key: string]: ChunkedMessageHandler} = {}
    public constructor(private cb: (data: Uint8Array)=>void) {

    }
    static getChunkedMessageHandler(label: string, cb: (data: Uint8Array)=>void): ChunkedMessageHandler {
        if(!ChunkedMessageHandler.handlers[label])
            ChunkedMessageHandler.handlers[label]  = new ChunkedMessageHandler(cb);
        return ChunkedMessageHandler.handlers[label];
    }
    public feedData(data: Uint8Array) {
        if(this.numChunks) {
            this.buffer.set(data, this.filledSize);
            this.filledSize += data.byteLength;
            this.numChunks -= 1;
            if(this.numChunks == 0) {   //data is complete
                this.cb(this.buffer);
            }
        }
        else if(data.byteLength >= this.chunkHeaderSize) {
            //check header;
            let view: DataView = new DataView(data.buffer);
            let off = 0;
            let header = view.getUint32(off, true);   off += 4;
            if(header == 0xFEEDFEED) {  //its chunked data
                this.filledSize = 0;
                this.numChunks = view.getUint32(off, true);   off += 4;
                this.totalSize = view.getUint32(off, true);   off += 4;
                this.buffer = new Uint8Array(this.totalSize);
            }
            else { //its not chunked data
                this.cb(data);
            }
        }
        else { //its not chunked data
            this.cb(data);
        }
    }
}
 function timeout(milliseconds: number): Promise<void> {
    return new Promise<void>(resolve=>setTimeout(resolve, milliseconds));
 }
export class WSService implements IDataSender {
    private ws: WebSocket;
    private connected: boolean = false;
    private url: string;
    private webRTCSignalar: WebRTCSignalar;

    private cmdId: number = 0;
    private promiseMap: Map<number, ResolveReject> = new Map<number, ResolveReject>();
    private exitFromServer: boolean = false;
    private pendingData: any[] = [];
    private stopHeartBeatTimer: boolean = false;
    private heartBeatInterval: boolean = false;
    private missedHeartBeat: number = 0;
    private heartBeatTimeout: number = 5000;
    private pingSendTime: Date = null;

    private mapDataChannel: Map<string, RTCDataChannel> = new Map<string, RTCDataChannel>();
    private chunkedMsgHandler: {[medium: string]: ChunkedMessageHandler} = {};
    private maxDataSizeForDataChannel: number = 50 * 1024;//50 kb
    stunServers: string[] = ["stun:stun.l.google.com:19302"];
    public constructor(url: string, private logger: Logger, private receiver: IDataReceiver) {
        this.url = url;
        this.ws = new WebSocket(url);
        this.ws.binaryType = "arraybuffer"; // Set binary type to handle binary data
        this.ws.onopen = () => {
            DLOG(this.logger, LogLevel.INFO, "WSService", `Connected to WebSocket at ${this.url}`);
            this.connected = true;
            this.receiver.onConnect();            
            this.flushPendingData();
            if(this.heartBeatTimeout != 0) {
                this.startHeartBeat(this.heartBeatTimeout);
            }
        };
        this.ws.onclose = (ev: CloseEvent) => {
            DLOG(this.logger, LogLevel.INFO, "WSService", `Disconnected from WebSocket at ${this.url}: Event code ${ev.code}, reason: ${ev.reason}`);
            this.connected = false;
            this.receiver.onDisconnect();
        };
        this.ws.onerror = (error) => {
            DLOG(this.logger, LogLevel.ERROR, "WSService", `WebSocket error: ${error}`);
        };
        this.ws.onmessage = (event) => {
            this.missedHeartBeat = 0;
            if(typeof(event.data) == "string" && event.data == "pong") {
                return;
            }
            this.handleMessage(event, 'websocket');
        };
    }
    private async startHeartBeat(interval: number) {
        console.info(`WSService:: Starting heartbeat timer`);
        this.heartBeatInterval = true;
        while(this.heartBeatInterval && !this.exitFromServer) {
            await timeout(interval);
            if(this.stopHeartBeatTimer) {
                break;
            }
            try {
                ++this.missedHeartBeat;
                if(this.connected) {
                    this.pingSendTime = new Date();
                    this.ws.send("ping");
                }
                else 
                    console.warn("Heartbeat failure");
                if(this.missedHeartBeat >= 3)
                    console.warn("Heartbeat failure");
            }
            catch(err){
                break;
            }
        }
        this.heartBeatInterval = false;
        this.missedHeartBeat = 0;
        if(this.stopHeartBeatTimer) {
            console.warn(`WSService:: Stopping Heartbeat`);
            return;
        }

        if(!this.exitFromServer) {
            //try to reconnect
            console.warn(`WSService:: Heartbeat fail... trying to reconnect`);
            //await this.reconnect();
        }
        else {
            console.warn(`WSService:: Exiting heartbeat timer because service is closed from server side`);
        }
    }
    private handleMessage(event: MessageEvent<any>, medium: 'websocket'|'webrtc'): void {
        if (event.data instanceof ArrayBuffer) {
            const data = new Uint8Array(event.data);
            // let handler = ChunkedMessageHandler.getChunkedMessageHandler(medium, (data)=>{
            //     this.receiver.onReceiveData(data);
            // });
            // handler.feedData(data);
            this.receiver.onReceiveData(data);
        } 
        else {
            try {
                var obj = JSON.parse(event.data);
                var cmdId = obj.cmdId;
                var data = obj.data;
                var error = obj.error
                
                if(this.promiseMap.has(cmdId)){
                    let promise = this.promiseMap.get(cmdId);
                    if(error) {
                        DLOG(this.logger, LogLevel.WARN, "WSService", `commlib: Error in Command ID ${cmdId} error: ${JSON.stringify(error)}`);
                        promise.reject(error);
                    }
                    else {
                        promise.resolve(data);
                    }
                    this.promiseMap.delete(cmdId);
                }
                else {
                    if(!this.webRTCSignalar || !obj.msgtype || obj.msgtype != "webrtc" || !this.webRTCSignalar.onMessage(obj.data)) {
                        DLOG(this.logger, LogLevel.ERROR, "WSService", `Received non binary data  ${event.data}`);
                    }
                }
            }
            catch(err) {
                DLOG(this.logger, LogLevel.ERROR, "WSService", `Received non binary data  ${event.data}`);
            }
        }
    }
    flushPendingData(): void {
        this.pendingData.forEach((data: string|ArrayBuffer)=>{
            this.ws.send(data);
        });
    }
    isConnected(): boolean {
        return this.connected;
    }
    sendData(data: Uint8Array): void {
        if (this.connected) {
            this.ws.send(data);
        } else {
            DLOG(this.logger, LogLevel.WARN, "WSService", "Attempted to send data while disconnected");
        }
    }
    sendTCPData(data: Uint8Array): void {
        if(this.mapDataChannel.has("tcp") && data.byteLength < this.maxDataSizeForDataChannel) {
            if(data.buffer instanceof ArrayBuffer)
                this.mapDataChannel.get("tcp").send(data.buffer);
        }
        else {
            this.sendData(data);
        }
    }
    sendUDPData(data: Uint8Array): void {
        if(this.mapDataChannel.has("udp") && data.byteLength < this.maxDataSizeForDataChannel) {
            if(data.buffer instanceof ArrayBuffer)
                this.mapDataChannel.get("udp").send(data.buffer);
        }
        else {
            this.sendData(data);
        }
    }
    
    sendText(text: string): void {
        if (this.connected) {
            this.ws.send(text);
        } else {
            DLOG(this.logger, LogLevel.WARN, "WSService", "Attempted to send text while disconnected");
        }
    }
    
    sendCmd(data: any, internal = false) : Promise<any>{
        if(this.exitFromServer)
            throw new Error("ws_not_connected");
        var d = { cmdId: this.cmdId, data: data };
        var promise = new Promise<any>((resolve, reject)=>{
            this.promiseMap.set(this.cmdId, {resolve: resolve, reject: reject});
        });
        ++this.cmdId;
        let msg = JSON.stringify(d);
        if(this.connected) {
            DLOG(this.logger, LogLevel.INFO, "WSService", `Sending command ${JSON.stringify(msg)} from service ${this.url}`);
            this.ws.send(msg);
        }
        else
            this.pendingData.push(msg);
        return promise;
    }
    async createWebRTCSignalar(): Promise<boolean> {
        if(this.webRTCSignalar)
            return true;
        let promise = new Promise<boolean>(async (resolve, reject)=> {
            this.webRTCSignalar = new WebRTCSignalar(this.logger, {
                onSendMessage: (data: {[key: string]: any}) => {
                    DLOG(this.logger, LogLevel.INFO, "WSService", `waiting for webrtc cmd ${JSON.stringify(data)} to complete`);
                    this.sendText(JSON.stringify({method: "webrtc", args: data}));
                    DLOG(this.logger, LogLevel.INFO, "WSService", `webrtc cmd ${JSON.stringify(data)} completed`);
                },
                onDataChannel: (ev: RTCDataChannelEvent) => {
                    let dc = ev.channel;
                    let label = dc.label;
                    this.mapDataChannel.set(label, dc);
                    dc.addEventListener('message', (ev: MessageEvent<any>)=> {
                        if (ev.data instanceof ArrayBuffer) {
                            const data = new Uint8Array(ev.data);
                            if(label == "udp") {
                                // let handler = ChunkedMessageHandler.getChunkedMessageHandler(label, (data)=>{
                                //     this.receiver.onReceiveUDPData(data);
                                // });
                                // handler.feedData(data);
                                this.receiver.onReceiveUDPData(data);
                            }
                            else if(label == "tcp") {
                                // let handler = ChunkedMessageHandler.getChunkedMessageHandler(label, (data)=>{
                                //     this.receiver.onReceiveData(data);
                                // });
                                // handler.feedData(data);
                                this.receiver.onReceiveData(data);
                            }
                        } else {
                            DLOG(this.logger, LogLevel.WARN, "WSService", "Received non-binary message");
                        }
                    });
                    dc.addEventListener('open', (ev: Event)=>{
                        DLOG(this.logger, LogLevel.INFO, "WSService", `data channel ${label} opened`);
                    });
                    dc.addEventListener('close', (ev: Event)=>{
                        DLOG(this.logger, LogLevel.INFO, "WSService", `data channel ${label} opened`);
                        this.mapDataChannel.delete(label);
                    });
                },
                onConnectionStateChange: (ev: RTCPeerConnectionState) => {
                }
            });
            DLOG(this.logger, LogLevel.INFO, "WSService", `initializing webrtc singlar`);
            await this.webRTCSignalar.init(this.stunServers);
            resolve(true);
            DLOG(this.logger, LogLevel.INFO, "WSService", `initializing webrtc singlar done`);
        });
        return promise;
    }
}