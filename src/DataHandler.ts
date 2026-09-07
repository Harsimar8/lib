import { DataSerializer } from "./DataSerializer";
import { ClientInfo, Enum, PropertySubscribeInterface, PublishedParam } from "./DataTypes";
import { DLOG, Logger, LogLevel } from "./Logger";
import { NetworkMemoryStreamReader } from "./NetworkMemoryStream";
import { CommandType, NotificationType, PacketType } from "./NetworkPackets";
import { PropValue } from "./PropValue";

export interface IDataReceiver {
    onConnect(): void;
    onDisconnect(): void;
    onReceiveUDPData(data: Uint8Array): void;
    onReceiveData(data: Uint8Array): void;
}
export interface IDataSender {
    sendTCPData(data: Uint8Array): void;
    sendUDPData(data: Uint8Array): void;
    sendText(text: string): void;
    isConnected(): boolean;
}
export interface IClientConnector extends IDataSender {
    onConnect(): void;
    onDisconnect(): void;
    onAppObjectDelete(objects: number[]): void;
    onAppParamRetract(params: number[]): void;
    onAppEnumRetract(enums: number[]): void;
    onAppParamUpdate(keys: number[], params: PropValue[]): void;
    onAppPublishedParams(publishedParams: PublishedParam[]): void;
    onAppPublishedEnums(enums: Array<[string, Enum]>): void;
    onAppPublishedObjects(objectKeys: string[]): void;
    onAppDataForRemote(data: {fromUID: string, toUID: string, data: Uint8Array}): void;
    onNotifyClientsAdded(clients: ClientInfo[]): void;
    onNotifyClientRemoved(clientNS: string): void;
    onNotifyClientsSubscriptions(clientsSubscription: Map<string, PropertySubscribeInterface[]>): void;
    onNotifyClientsUnsubscriptions(clientsSubscription: Map<string, number[]>): void;
}

export class DataHandler implements IDataReceiver {
    private m_mapPromisedRequests: Map<number, {resolve: (v: Uint8Array)=>void, reject: ()=>void}> = new Map();
    private m_nextRequestId: number = 0;

    constructor(private connector: IClientConnector, private logger: Logger) {
    }
    onConnect(): void {
        this.connector.onConnect();
    }
    onDisconnect(): void {
        this.connector.onDisconnect();
    }
    onReceiveUDPData(data: Uint8Array): void {
        const netstream = new NetworkMemoryStreamReader(data);
        const type = netstream.readUint16();
        const packetType= type as PacketType;
        switch (packetType) {
            case PacketType.APP_PARAM_UPDATE:
            this.handleAppParamUpdate(netstream);
            break;
            default:
            DLOG(this.logger, LogLevel.WARN, 'DataHandler', `onReceiveUDPData: Unknown packet type: ${packetType}`);
            break;
        }        
    }
    onReceiveData(data: Uint8Array): void {        
        const netstream = new NetworkMemoryStreamReader(data);
        const type = netstream.readUint16();
        const packetType = type as PacketType;
        
        switch (packetType) {
            case PacketType.APP_RESPONSE:
            this.handleAppResponse(netstream);
            break;
            case PacketType.APP_OBJECT_DELETE:
            this.handleAppObjectDelete(netstream);
            break;
            case PacketType.APP_PARAM_RETRACT:
            this.handleAppParamRetract(netstream);
            break;
            case PacketType.APP_ENUM_RETRACT:
            this.handleAppEnumRetract(netstream);
            break;
            case PacketType.APP_PUBLISHED_PARAMS:
            this.handleAppPublishedParams(netstream);
            break;
            case PacketType.APP_PUBLISHED_OBJECTS:
            this.handleAppPublishedObjects(netstream);
            break;
            case PacketType.APP_PUBLISHED_ENUMS:
            this.handleAppPublishedEnums(netstream);
            break;
            case PacketType.APP_PARAM_UPDATE:
            this.handleAppParamUpdate(netstream);
            break;
            case PacketType.APP_NOTIFICATIONS:
            this.handleAppNotifications(netstream);
            break;
            case PacketType.APP_COMMAND:
            this.handleAppCommand(netstream);
            break;
            case PacketType.APP_DATA_FOR_REMOTE_APP:
            this.handlerAppDataForRemote(netstream);
            break;
            default:
            DLOG(this.logger, LogLevel.ERROR, 'DataHandler', `Unknown packet type: ${packetType}`);
            break;
        }
    }
    
    private handleAppObjectDelete(reader: NetworkMemoryStreamReader): void {
        const objects = DataSerializer.deserializeParamArray(reader);
        this.connector.onAppObjectDelete(objects);
    }
    
    
    private handleAppParamRetract(reader: NetworkMemoryStreamReader): void {
        const params = DataSerializer.deserializeParamArray(reader);
        this.connector.onAppParamRetract(params);
    }
    
    private handleAppEnumRetract(reader: NetworkMemoryStreamReader): void {
        const enums = DataSerializer.deserializeParamArray(reader);
        this.connector.onAppEnumRetract(enums);
    }
    
    private handleAppPublishedParams(reader: NetworkMemoryStreamReader): void {
        const publishedParams = DataSerializer.deserializePublishedParam(reader);
        this.connector.onAppPublishedParams(publishedParams);
    }
    
    private handleAppPublishedObjects(reader: NetworkMemoryStreamReader): void {
        const objects = DataSerializer.deserializeStringArray(reader);
        this.connector.onAppPublishedObjects(objects);
    }
    
    private handleAppPublishedEnums(reader: NetworkMemoryStreamReader): void {
        const enums = DataSerializer.deserializePublishedEnums(reader);
        this.connector.onAppPublishedEnums(enums);
    }
    
    
    private handleAppParamUpdate(reader: NetworkMemoryStreamReader): void {
        const {paramKeys, propValues} = DataSerializer.deserializePropUpdate(reader);
        this.connector.onAppParamUpdate(paramKeys, propValues);
    }

    private handleAppResponse(reader: NetworkMemoryStreamReader): void {
        const {context, data} = DataSerializer.deserializeRequestResponse(reader);
        DLOG(this.logger, LogLevel.INFO, 'DataHandler', `Received app response for context ${context}`);
        if (this.m_mapPromisedRequests.has(context)) {
            const {resolve, reject} = this.m_mapPromisedRequests.get(context)!;
            this.m_mapPromisedRequests.delete(context);
            resolve(data);
        }
    }
    private handleDbgNotifyClientAdded(reader: NetworkMemoryStreamReader): void {
        let clients = DataSerializer.deserializeClients(reader);
        this.connector.onNotifyClientsAdded(clients);
    }
    private handleDbgNotifyClientRemoved(reader: NetworkMemoryStreamReader): void {
        let clientNS = DataSerializer.deserializeString(reader);
        this.connector.onNotifyClientRemoved(clientNS);
    }
    private handleDbgNotifyClientSubscribed(reader: NetworkMemoryStreamReader): void {
        let clientsSubscriptions = DataSerializer.deserializeClientsSubscriptions(reader);
        this.connector.onNotifyClientsSubscriptions(clientsSubscriptions);
    }
    private handleDbgNotifyClientUnsubscribed(reader: NetworkMemoryStreamReader): void {
        let clientsSubscriptions = DataSerializer.deserializeStringPropsMap(reader);
        this.connector.onNotifyClientsUnsubscriptions(clientsSubscriptions);
    }
    private handleAppCommand(reader: NetworkMemoryStreamReader): void {
        const data: Uint8Array = reader.readByteVector();
        let dataReader: NetworkMemoryStreamReader = new NetworkMemoryStreamReader(data);
        const cmdType: CommandType = dataReader.readCommandType();
        switch(cmdType) {
            case CommandType.DEBUG_CMD_SET_LOG_LEVEL: {
                break;
            }
        }
    }
    private handlerAppDataForRemote(reader: NetworkMemoryStreamReader): void {
        const data = DataSerializer.deserializeDataForRemoteApp(reader);
        this.connector.onAppDataForRemote(data);
    }
    private handleAppNotifications(reader: NetworkMemoryStreamReader): void {
        const notificationData: Uint8Array = reader.readByteVector();
        let notificationReader: NetworkMemoryStreamReader = new NetworkMemoryStreamReader(notificationData);
        const notificationType: NotificationType = notificationReader.readNotificationType();
        switch(notificationType) {
            case NotificationType.DEBUG_NOTIFY_CLIENT_ADDED: {
                this.handleDbgNotifyClientAdded(notificationReader);
                break;
            }
            case NotificationType.DEBUG_NOTIFY_CLIENT_REMOVED: {
                this.handleDbgNotifyClientRemoved(notificationReader);
                break;
            }
            case NotificationType.DEBUG_NOTIFY_CLIENT_SUBSCRIBED: {
                this.handleDbgNotifyClientSubscribed(notificationReader);
                break;
            }
            case NotificationType.DEBUG_NOTIFY_CLIENT_UNSUBSCRIBED: {
                this.handleDbgNotifyClientUnsubscribed(notificationReader);
                break;
            }
        }
    }
    async sendRequest(data: Uint8Array): Promise<Uint8Array> {
        const requestId = this.m_nextRequestId++;
        DLOG(this.logger, LogLevel.INFO, "DataHandler", `Sending request ${requestId}`);
        data = DataSerializer.buildPacket(PacketType.APP_REQUEST, DataSerializer.serializeRequestResponse, requestId, data);
        const promise = new Promise<Uint8Array>((resolve, reject) => {
            this.m_mapPromisedRequests.set(requestId, {resolve, reject});
        });
        this.connector.sendTCPData(data);
        return promise;
    }
    sendCommand(data: Uint8Array): void {
        DLOG(this.logger, LogLevel.INFO, "DataHandler", `Sending Command`);
        data = DataSerializer.buildPacket(PacketType.APP_COMMAND, DataSerializer.serializeUint8Array, data);
        this.connector.sendTCPData(data);
    }
}