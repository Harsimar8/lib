import { BaseClient, IClientEvents } from "./BaseClient";
import { DataSerializer } from "./DataSerializer";
import { DataStore } from "./DataStore";
import { ClientInfo, PropertySubscribeInterface, PSLogLevel } from "./DataTypes";
import { DLOG, Logger, LogLevel } from "./Logger";
import { CommandType, NotificationType, PacketType } from "./NetworkPackets";
export interface IDebugClientEvents extends IClientEvents {
    onNotifyClientsAdded(clients: ClientInfo[]): void;
    onNotifyClientRemoved(clientNS: string): void;
    onNotifyClientsSubscriptions(clientsSubscription: Map<string, PropertySubscribeInterface[]>): void;
    onNotifyClientsUnsubscriptions(clientsSubscription: Map<string, number[]>): void;
}
export class DebugClient extends BaseClient {
    constructor(namespace: string, eventHandler: IDebugClientEvents, dataStore: DataStore, logger: Logger) {
        super(namespace, eventHandler, dataStore, logger);
    }
    static override create(namespace: string, eventHandler: IDebugClientEvents, dataStore: DataStore, logger: Logger) {
        return new DebugClient(namespace, eventHandler, dataStore, logger);
    }
    override onConnect(): void {
        super.onConnect();
        let notifications: NotificationType[] = [
            NotificationType.DEBUG_NOTIFY_CLIENT_ADDED, 
            NotificationType.DEBUG_NOTIFY_CLIENT_REMOVED, 
            NotificationType.DEBUG_NOTIFY_CLIENT_SUBSCRIBED, 
            NotificationType.DEBUG_NOTIFY_CLIENT_UNSUBSCRIBED,
            NotificationType.DEBUG_NOTIFY_KEY_LOCKED, 
            NotificationType.DEBUG_NOTIFY_KEY_UNLOCKED,
        ];
        const data = DataSerializer.buildPacket(PacketType.APP_REGISTER_NOTIFICATIONS, DataSerializer.serializeParamArray, notifications);
        this.sendTCPData(data);
    }
    async GetKeyLockers(keys: number[]): Promise<Map<string, number[]>> {
        DLOG(this.logger, LogLevel.INFO, "DebugClient", `Sending KeyLockers Request`);
        const data = DataSerializer.buildPacket(CommandType.DEBUG_CMD_GET_KEY_LOCKER as unknown as PacketType, DataSerializer.serializeParamArray, keys);
        const response = await this.sendRequest(data);
        const parsed = DataSerializer.parsePacket(response, CommandType.DEBUG_CMD_GET_KEY_LOCKER as unknown as PacketType, DataSerializer.deserializeStringPropsMap);
        return parsed;
    }
    async GetPropsPublisher(keys: number[]): Promise<Map<string, number[]>> {
        DLOG(this.logger, LogLevel.INFO, "DebugClient", `Sending Props Publisher Request`);
        const data = DataSerializer.buildPacket(CommandType.DEBUG_CMD_GET_PROPS_PUBLISHER as unknown as PacketType, DataSerializer.serializeParamArray, keys);
        const response = await this.sendRequest(data);
        const parsed = DataSerializer.parsePacket(response, CommandType.DEBUG_CMD_GET_PROPS_PUBLISHER as unknown as PacketType, DataSerializer.deserializeStringPropsMap);
        return parsed;
    }
    async GetObjsPublisher(keys: number[]): Promise<Map<string, number[]>> {
        DLOG(this.logger, LogLevel.INFO, "DebugClient", `Sending Obj Publisher Request`);
        const data = DataSerializer.buildPacket(CommandType.DEBUG_CMD_GET_OBJS_PUBLISHER as unknown as PacketType, DataSerializer.serializeParamArray, keys);
        const response = await this.sendRequest(data);
        const parsed = DataSerializer.parsePacket(response, CommandType.DEBUG_CMD_GET_OBJS_PUBLISHER as unknown as PacketType, DataSerializer.deserializeStringPropsMap);
        return parsed;
    }
    async GetClients(): Promise<ClientInfo[]> {
        DLOG(this.logger, LogLevel.INFO, "DebugClient", `Sending GetClients Request`);
        const data = DataSerializer.buildEmptyPacket(CommandType.DEBUG_CMD_GET_CLIENTS as unknown as PacketType);
        const response = await this.sendRequest(data);
        const parsed = DataSerializer.parsePacket(response, CommandType.DEBUG_CMD_GET_CLIENTS as unknown as PacketType, DataSerializer.deserializeClients);
        return parsed;
    }
    async GetClientsSubscriptions(clients: string[]): Promise<Map<string, PropertySubscribeInterface[]>> {
        DLOG(this.logger, LogLevel.INFO, "DebugClient", `Sending GetClientsSubscriptions Request`);
        const data = DataSerializer.buildPacket(CommandType.DEBUG_CMD_GET_CLIENTS_SUBSCRIPTIONS as unknown as PacketType, DataSerializer.serializeStringArray, clients);
        const response = await this.sendRequest(data);
        const parsed = DataSerializer.parsePacket(response, CommandType.DEBUG_CMD_GET_CLIENTS_SUBSCRIPTIONS as unknown as PacketType, DataSerializer.deserializeClientsSubscriptions);
        return parsed;
    }    
    async GetServerInfo(): Promise<string> {
        DLOG(this.logger, LogLevel.INFO, "DebugClient", `Sending GetServerInfo Request`);
        const data = DataSerializer.buildEmptyPacket(CommandType.DEBUG_CMD_GET_SERVER_INFO as unknown as PacketType);
        const response = await this.sendRequest(data);
        const parsed = DataSerializer.parsePacket(response, CommandType.DEBUG_CMD_GET_SERVER_INFO as unknown as PacketType, DataSerializer.deserializeString);
        return parsed;
    }
    async GetServerStats(): Promise<string> {
        DLOG(this.logger, LogLevel.INFO, "DebugClient", `Sending GetServerStats Request`);
        const data = DataSerializer.buildEmptyPacket(CommandType.DEBUG_CMD_GET_SERVER_STATS as unknown as PacketType);
        const response = await this.sendRequest(data);
        const parsed = DataSerializer.parsePacket(response, CommandType.DEBUG_CMD_GET_SERVER_STATS as unknown as PacketType, DataSerializer.deserializeString);
        return parsed;
    }
    SetLogLevel(uid: string, key: string, ll: PSLogLevel): void {
        DLOG(this.logger, LogLevel.INFO, "DebugClient", `Sending SetLogLevel Request uid: ${uid}, key: ${key}, ll: ${ll}`);
        const data = DataSerializer.buildPacket(CommandType.DEBUG_CMD_SET_LOG_LEVEL as unknown as PacketType, DataSerializer.serializeLogLevel, uid, key, ll);
        this.sendCommand(data);
    }
    async SaveSnapshot(): Promise<string> {
        DLOG(this.logger, LogLevel.INFO, "DebugClient", `Sending SaveSnapshot Request`);
        const data = DataSerializer.buildEmptyPacket(CommandType.DEBUG_CMD_SAVE_SNAPSHOT as unknown as PacketType);
        const response = await this.sendRequest(data);
        const parsed = DataSerializer.parsePacket(response, CommandType.DEBUG_CMD_SAVE_SNAPSHOT as unknown as PacketType, DataSerializer.deserializeString);
        return parsed;
    }
    async LoadSnapshot(snapshotJson: string): Promise<string> {
        DLOG(this.logger, LogLevel.INFO, "DebugClient", `Sending LoadSnapshot Request`);
        const data = DataSerializer.buildPacket(CommandType.DEBUG_CMD_LOAD_SNAPSHOT as unknown as PacketType, DataSerializer.serializeString, snapshotJson);
        const response = await this.sendRequest(data);
        const parsed = DataSerializer.parsePacket(response, CommandType.DEBUG_CMD_LOAD_SNAPSHOT as unknown as PacketType, DataSerializer.deserializeString);
        return parsed;
    }
    async LoadProperties(snapshotJson: string): Promise<string> {
        DLOG(this.logger, LogLevel.INFO, "DebugClient", `Sending LoadProperties Request`);
        const data = DataSerializer.buildPacket(CommandType.DEBUG_CMD_LOAD_PROPERTIES as unknown as PacketType, DataSerializer.serializeString, snapshotJson);
        const response = await this.sendRequest(data);
        const parsed = DataSerializer.parsePacket(response, CommandType.DEBUG_CMD_LOAD_PROPERTIES as unknown as PacketType, DataSerializer.deserializeString);
        return parsed;
    }
    async EjectClient(clientUID: string): Promise<string> {
        DLOG(this.logger, LogLevel.INFO, "DebugClient", `Ejecting Client ${clientUID}`);
        const data = DataSerializer.buildPacket(CommandType.DEBUG_CMD_EJECT_CLIENT as unknown as PacketType, DataSerializer.serializeString, clientUID);
        const response = await this.sendRequest(data);
        const parsed = DataSerializer.parsePacket(response, CommandType.DEBUG_CMD_EJECT_CLIENT as unknown as PacketType, DataSerializer.deserializeString);
        return parsed;
    }   
    onNotifyClientsAdded(clients: ClientInfo[]): void {
        DLOG(this.logger, LogLevel.INFO, "DebugClient", `Notification Received Clients Added`);
        (this.eventHandler as IDebugClientEvents).onNotifyClientsAdded(clients);
    }
    onNotifyClientRemoved(clientNS: string): void {
        DLOG(this.logger, LogLevel.INFO, "DebugClient", `Notification Received Client Removed ${clientNS}`);
        (this.eventHandler as IDebugClientEvents).onNotifyClientRemoved(clientNS);
    }
    onNotifyClientsSubscriptions(clientsSubscription: Map<string, PropertySubscribeInterface[]>): void {
        DLOG(this.logger, LogLevel.INFO, "DebugClient", `Notification Received Client Subscriptions`);
        (this.eventHandler as IDebugClientEvents).onNotifyClientsSubscriptions(clientsSubscription);
    }
    onNotifyClientsUnsubscriptions(clientsSubscription: Map<string, number[]>): void {
        DLOG(this.logger, LogLevel.INFO, "DebugClient", `Notification Received Client UnSubscriptions`);
        (this.eventHandler as IDebugClientEvents).onNotifyClientsUnsubscriptions(clientsSubscription);
    }
}