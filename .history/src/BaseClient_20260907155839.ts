import { DataHandler, IClientConnector, IDataSender } from "./DataHandler";
import { DataSerializer } from "./DataSerializer";
import { DataStore } from "./DataStore";
import { Enum, PropertySubscribeInterface, PatternedParamSubscribeInterface, PropValueType, PublishedParam, EnumPublishInterface, ObjectCreateInterface, PropertyPublishInterface, ClientInfo } from "./DataTypes";
import { DataUpdate } from "./DataUpdate";
import { keyFromString, stringFromKey } from "./KeyOrString";
import { DLOG, Logger, LogLevel } from "./Logger";
import { CommandType, PacketType } from "./NetworkPackets";
import { PropValue } from "./PropValue";
import { TimerThread } from "./TimerThread";
import { wildcmp } from "./Utitlity";

export interface IClientEvents {
    onConnect(): void;
    onAppPublishedParams(publishedParams: PublishedParam[]): void;
    onAppParamRetract(keys: number[]): void;
    onAppPublishedObjects(objectKeys: string[]): void;
    onAppObjectDelete(objects: number[]): void;
    onAppDataFromRemote(fromUID: string, data: Uint8Array): void;
}
export class BaseClient implements IClientConnector {
    private currTime = 0.0;
    private readonly dataStore: DataStore;
    private dataSender: IDataSender;
    private readonly dataHandler: DataHandler;
    private readonly dataUpdate: DataUpdate;
    protected readonly logger: Logger;
    private readonly patternedSubscriptions: PatternedParamSubscribeInterface[] = [];
    private pendingSubscriptions = new Map<number, PropertySubscribeInterface>();
    private sentSubscriptions = new Set<number>();
    private timer?: TimerThread;
    private uid: string;
    constructor(protected namespace: string, protected eventHandler: IClientEvents, dataStore: DataStore, logger: Logger) {
        this.dataStore = dataStore;
        this.logger = logger;
        this.dataUpdate = new DataUpdate();
        this.dataHandler = new DataHandler(this, this.logger);

    }
    getDataHandler(): DataHandler {
        return this.dataHandler;
    }
    getDataStore(): DataStore {
        return this.dataStore;
    }
    getLogger(): Logger {
        return this.logger;
    }
    public static create(namespace: string, eventHandler: IClientEvents, dataStore: DataStore, logger: Logger): BaseClient {
        return new BaseClient(namespace, eventHandler, dataStore, logger);
    }
    public setDataSender(dataSender: IDataSender): void {
        this.dataSender = dataSender;
    }
    
    public initialize(config: any): boolean {
        // Init logic from parent PubSubConnector if needed
        this.timer = new TimerThread(15, () => {
            this.sendUpdates();
            this.currTime += 0.015;
        });
        this.timer.start();
        return true;
    }
    static createUID(): string {
        const msec = (new Date()).getTime();
         // Generate using two 16-bit random parts
        const rand = Math.floor(Math.random() * 0x100000000); // 0 to 0xFFFF
        
        function toHex(value: number, length: number): string {
           return value.toString(16).padStart(length, '0');
        }
        let msecStr = toHex(msec, 11);
        let randStr = toHex(rand, 13);
        const uid = msecStr + randStr;
        return uid;
    }
    canPublish(): boolean {
        return false;
    }
    onConnect(): void {        
        //send authentication
        this.uid = BaseClient.createUID();
        this.sendText(JSON.stringify({
            "appNS": `${this.namespace}`,
            "uid": this.uid,
            "canPublish": this.canPublish(),
            "authToken": "your_auth_token"
        }));
        this.eventHandler.onConnect();
    }
    onDisconnect(): void {
    }
    onAppObjectDelete(objects: number[]): void {
        this.eventHandler.onAppObjectDelete(objects);
    }
    onAppPublishedObjects(objectKeys: string[]): void {
        objectKeys.forEach((o)=> {
            this.dataStore.putObject(keyFromString(o), "");
        });
        this.eventHandler.onAppPublishedObjects(objectKeys);
    }
    public onAppPublishedEnums(enums: [string, Enum][]): void {
        DLOG(this.logger, LogLevel.INFO, 'BaseClient', `Enums published: ${JSON.stringify(enums)}`);
        for (const [name, e] of enums) {
            const key = keyFromString(name);
            e.bRemote = true;
            this.dataStore.putEnum(key, e);
        }
    }
    
    public onAppEnumRetract(keys: number[]): void {
        for (const key of keys) {
            this.dataStore.removeEnum(key);
        }
    }
    
    public onAppPublishedParams(publishedParams: PublishedParam[]): void {
        for (const param of publishedParams) {
            const key = keyFromString(param.paramKey);
            this.dataStore.setPropMeta(key, {
                type: param.paramType,
                bRemote: true,
                bReadOnly: param.readOnly,
                bEvent: param.bEvent
            });
            
            if (this.dataStore.getPropType(key) === PropValueType.NOTHING) {
                const defaultVal = PropValue.getDefault(param.paramType);
                this.dataStore.createProp(key, defaultVal);
            }
        }
        
        const patternedParams = publishedParams
        .map(p => {
            const iface: PropertySubscribeInterface = {
                key: keyFromString(p.paramKey),
                dtms: 0,
                eps: 0,
                reliableMedium: false
            };
            return this.isPatternedSubscription(p.paramKey, iface) ? iface : null;
        })
        .filter(Boolean) as PropertySubscribeInterface[];
        
        this.subscribeParameters(patternedParams);
        this.subscribePendingParamsNoLock();
        this.eventHandler.onAppPublishedParams(publishedParams);
    }
    public onAppDataForRemote(data: {fromUID: string, toUID: string, data: Uint8Array}): void {
        this.eventHandler.onAppDataFromRemote(data.fromUID, data.data);
    }
    private isPatternedSubscription(param: string, output: PropertySubscribeInterface): boolean {
        for (const sub of this.patternedSubscriptions) {
            if (wildcmp(sub.pattern, param)) {
                output.key = keyFromString(param);
                output.dtms = sub.dtms;
                output.eps = sub.eps;
                output.reliableMedium = sub.reliableMedium;
                return true;
            }
        }
        return false;
    }
    
    public onAppParamRetract(keys: number[]): void {
        for (const key of keys) {
            this.dataStore.getPropMetaData(key).bRemote = false;
            this.pendingSubscriptions.delete(key);
            this.sentSubscriptions.delete(key);
        }
        this.eventHandler.onAppParamRetract(keys);
    }
    
    public onAppParamUpdate(keys: number[], values: PropValue[]): void {
        DLOG(this.logger, LogLevel.DEBUG, "BaseClient", `onAppParamUpdate: ${JSON.stringify(keys.reduce((acc, key, idx)=>{acc[stringFromKey(key)] = values[idx].toString(); return acc;}, {} as Record<string, string>))}`);
        for (let i = 0; i < keys.length; i++) {
            this.dataStore.putProp(keys[i], values[i]);
        }
    }
    
    public subscribeParameters(props: PropertySubscribeInterface[]): void {
        if (!props.length) return;

        for (const p of props) {
            this.pendingSubscriptions.set(p.key, p);
        }
        this.subscribePendingParamsNoLock();
    }
    
    private subscribePendingParamsNoLock(): void {
        if(!this.isConnected())  return;

        const subscribable = Array.from(this.pendingSubscriptions.values()).filter(sub => {
            return this.dataStore.getPropMetaData(sub.key).bRemote;
        });
        
        for (const p of subscribable) {
            this.sentSubscriptions.add(p.key);
            this.pendingSubscriptions.delete(p.key);
        }
        
        if (subscribable.length > 0) {
            const data = DataSerializer.buildPacket(PacketType.APP_PARAM_SUBSCRIBE, DataSerializer.serializeParamSubscribe, subscribable);
            this.sendTCPData(data);
        }
    }
    
    public unsubscribeParameters(keys: number[]): void {
        if (!keys.length) return;
        
        const propsToUnsub: number[] = [];
        
        for (const key of keys) {
            this.pendingSubscriptions.delete(key);
            if (this.sentSubscriptions.delete(key)) {
                propsToUnsub.push(key);
            }
        }
        
        if (propsToUnsub.length > 0) {
            const data = DataSerializer.buildPacket(PacketType.APP_PARAM_UNSUBSCRIBE, DataSerializer.serializeParamArray, propsToUnsub);
            this.sendTCPData(data);
        }
    }
    
    public async requestObjectInitData(objectKeys: number[]): Promise<Map<number, string>> {
        const unavailable = new Set(objectKeys);
        const result = new Map<number, string>();
        
        while (unavailable.size > 0) {
            for (const key of unavailable) {
                if (this.dataStore.hasObject(key)) {
                    unavailable.delete(key);
                }
            }
            if (unavailable.size > 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        const data = DataSerializer.buildPacket(CommandType.APP_CMD_OBJECT_INIT_DATA as unknown as PacketType, DataSerializer.serializeParamArray, objectKeys);
        const response = await this.sendRequest(data);
        const parsed = DataSerializer.parsePacket(response, CommandType.APP_CMD_OBJECT_INIT_DATA as unknown as PacketType, DataSerializer.deserializeObjectInitResponseData);
        parsed.forEach((v: string, k: number)=> {
            this.dataStore.putObject(k, v);
        });
        return parsed;
    }
    public selfUID(): string {
        return this.uid;
    }
    public sendDataToRemoteApp(toUID: string, dataForRemote: string): void {
    const fromUID: string = this.uid;

    console.log("===== SENDING REMOTE DATA =====");
    console.log("From UID:", fromUID);
    console.log("To UID:", toUID);
    console.log("Message:", dataForRemote);

    const data = DataSerializer.buildPacket(
        PacketType.APP_DATA_FOR_REMOTE_APP,
        DataSerializer.serializeDataForRemoteApp,
        fromUID,
        toUID,
        dataForRemote
    );

    console.log("Packet created:", data);

    this.sendTCPData(data);

    console.log("Packet sent to TCP/WebSocket layer");
}
    private sendUpdates(): void {
        this.dataUpdate.sendUpdates((data, reliable) => {
            this.sendTCPData(data);
        });
    }
    
    public onParamValueChange(key: number, value: PropValue): void {
        this.dataStore.putProp(key, value);
        const remote = this.dataStore.getPropMetaData(key).bRemote;
        if (remote) {
            this.dataUpdate.onUpdateParamServer(key, value);
        }
    }
    
    public notifyPropChange(key: number): void {
        const remote = this.dataStore.getPropMetaData(key).bRemote;
        const value = this.dataStore.getProp(key);
        if (remote) {
            this.dataUpdate.onUpdateParamServer(key, value);
        }
    }
    public notifyEvent(key: number): void {
        const meta = this.dataStore.getPropMetaData(key);
        const value = this.dataStore.getProp(key);
        if (meta.bRemote && meta.bEvent) {
            this.dataUpdate.onUpdateParamServer(key, value);
        }
    }

    sendTCPData(data: Uint8Array): void {
        this.dataSender.sendTCPData(data);
    }
    sendUDPData(data: Uint8Array): void {
        this.dataSender.sendUDPData(data);
    }
    sendText(text: string): void {
        this.dataSender.sendText(text);
    }
    async sendRequest(data: Uint8Array): Promise<Uint8Array> {
        return await this.dataHandler.sendRequest(data);
    }
    sendCommand(data: Uint8Array): void {
        this.dataHandler.sendCommand(data);
    }
    public isSubscriptionSent(key: number): boolean {
        return this.sentSubscriptions.has(key);
    }
    public isConnected(): boolean {
        return this.dataSender.isConnected();
    }
    onNotifyClientsAdded(clients: ClientInfo[]): void {}
    onNotifyClientRemoved(clientNS: string): void {}
    onNotifyClientsSubscriptions(clientsSubscription: Map<string, PropertySubscribeInterface[]>): void {}
    onNotifyClientsUnsubscriptions(clientsSubscription: Map<string, number[]>): void {}
}