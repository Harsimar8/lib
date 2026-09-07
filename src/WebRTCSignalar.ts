import { DLOG, Logger, LogLevel } from "./Logger";

export interface IWebRTCSignalHandler {
    onSendMessage(data: {[key: string]: any}): void;
    onTrack?(ev: RTCTrackEvent): void;
    onDataChannel?(ev: RTCDataChannelEvent): void;
    onConnectionStateChange?(ev: RTCPeerConnectionState): void;
}
export class WebRTCSignalar {
    private pc: RTCPeerConnection;
    constructor(private logger: Logger, public signalHandler: IWebRTCSignalHandler) {}
    async init(stunServers: string[]): Promise<void> {
        this.logger.info(`stuns servers:: ${JSON.stringify(stunServers, null, 2)}`);
        this.pc = new RTCPeerConnection( {iceServers: [{urls: stunServers}]});
        this.pc.onicecandidate = (ev: RTCPeerConnectionIceEvent) => this.onLocalICECandidate(ev);
        this.pc.onicecandidateerror = (ev: Event) => this.onIceCandidateError(ev);
        this.pc.oniceconnectionstatechange = (ev: Event) => {this.logger.debug("*** ICE connection state changed to " + this.pc.iceConnectionState);};
        this.pc.onicegatheringstatechange = (ev: Event) => {this.logger.debug("*** ICE gathering state changed to: " + this.pc.iceGatheringState)};
        this.pc.onsignalingstatechange = (ev: Event) => {this.logger.debug("*** WebRTC signaling state changed to: " + this.pc.signalingState)};
        this.pc.onconnectionstatechange = (ev: Event) => this.onConnectionStateChange(ev);
        this.pc.ontrack = (ev: RTCTrackEvent) => this.onTrackEvent(ev);
        this.pc.ondatachannel = (ev: RTCDataChannelEvent) => this.onDataChannel(ev);
        await this.sendCmd({
            method: 'WebRTCSignal.init', 
        });
    }
    async createOffer(): Promise<void> {
        let offer = await this.pc.createOffer({iceRestart: true});
        await this.pc.setLocalDescription(offer);
        let sdp = this.pc.localDescription;
        await this.sendCmd({
            method: 'WebRTCSignal.sdp',
            type: sdp.type,
            content: sdp.sdp
        });
    }
    createDataChannel(ordered: boolean, reliable: boolean): RTCDataChannel {
        let dc = this.pc.createDataChannel("na", {ordered: ordered, maxRetransmits: reliable ? null : 0});
        dc.binaryType = 'arraybuffer';
        return dc;
    }
    free(): void {
        if(this.pc) {
            this.pc.close();
        }
    }
    async sendCmd(data: {[key: string]: any}): Promise<void> {
        await this.signalHandler.onSendMessage(data);        
    }
    onDataChannel(ev: RTCDataChannelEvent): void {
        this.signalHandler.onDataChannel?.(ev);
    }
    onTrackEvent(ev: RTCTrackEvent): void {
        this.signalHandler.onTrack?.(ev);
    }
    onConnectionStateChange(ev: Event): void {
        this.signalHandler.onConnectionStateChange?.(this.pc.connectionState);
    }
    onIceCandidateError(ev: any): void {
        let msg = {
            address: ev.address,
            errorCode: ev.errorCode,
            errorText: ev.errorText,
            port: ev.port,
            url: ev.url
        };
        DLOG(this.logger, LogLevel.WARN, "WSService", `"***ICE Candidate Error*** ${JSON.stringify(msg, null, 2)}`);
    }
    onLocalICECandidate(ev: RTCPeerConnectionIceEvent): void {
        if(!ev.candidate)
            return;
        DLOG(this.logger, LogLevel.DEBUG, "WSService", "ice candidate sent " + ev.candidate.candidate);
        this.sendCmd({
            method: 'WebRTCSignal.ice_candidate', 
            content: ev.candidate.candidate, 
            sdpmid: ev.candidate.sdpMid, 
            sdp_mline_index: ev.candidate.sdpMLineIndex
        });
    }
    async setDataChannelStatus(enabled: boolean): Promise<void> {
        await this.sendCmd({
            method: 'WebRTCSignal.useDataChannel', 
            args: {
                enabled: enabled
            }
        });
    }
    private async onSDP(args: {[key: string]: any}): Promise<void> {
        let type = args['type'];
        if(type == 'offer') {
            try {
                let content = args['content'];
                let desc = new RTCSessionDescription({type: type, sdp: content});
                if(this.pc.signalingState != "stable") {
                    DLOG(this.logger, LogLevel.DEBUG, "WSService", "offer received " + content + "  - But the signaling state isn't stable, so triggering rollback");
                    // Set the local and remove descriptions for rollback; don't proceed
                    // until both return.
                    await Promise.all([
                        this.pc.setLocalDescription({type: "rollback"}),
                        this.pc.setRemoteDescription(desc)
                    ]);
                    return;
                }
                else {
                    DLOG(this.logger, LogLevel.DEBUG, "WSService", "offer received " + content + "  - Setting remote description");
                    await this.pc.setRemoteDescription(desc);                
                }
                let answer = await this.pc.createAnswer();
                await this.pc.setLocalDescription(answer);
                this.sendCmd({
                        method: 'WebRTCSignal.sdp', 
                        type: answer.type, 
                        content: answer.sdp
                    }
                );
            }
            catch(err) {
                this.logger.error(err as string);
            }
        }
        else if(type == 'answer') {
            await this.pc.setRemoteDescription({type: type, sdp: args["content"]});
        }
    }
    private onRemoteICECandidate(args: {[key: string]: any}): void {
        DLOG(this.logger, LogLevel.DEBUG, "WSService", `ICE Candidate received ${JSON.stringify(args, null, 2)}`);
        let candidate = args['content'];
        let sdpMid = args['sdpmid'];
        let sdpMLineIndex = args['sdp_mline_index'];
        this.pc.addIceCandidate(new RTCIceCandidate({candidate: candidate, sdpMid: sdpMid, sdpMLineIndex: sdpMLineIndex}));
    }
    async onMessage(msg: string): Promise<boolean> {
        let obj = JSON.parse(msg);
        let method = obj.method;
        if(!method)
            return;
        switch(method) {
            case 'WebRTCSignal.sdp': {
                await this.onSDP(obj);
                break;
            }
            case 'WebRTCSignal.ice_candidate': {
                this.onRemoteICECandidate(obj);
                break;
            }
            default: {
                return false;
            }
        }
        return true;
    }
}