import { BaseClient, IClientEvents } from "./BaseClient";
import { DataSerializer } from "./DataSerializer";
import { DataStore } from "./DataStore";
import { ObjectCreateInterface, PropertyPublishInterface } from "./DataTypes";
import { keyFromString, keyNames } from "./KeyOrString";
import { DLOG, Logger, LogLevel } from "./Logger";
import { PacketType } from "./NetworkPackets";
import { PropValue } from "./PropValue";

export class RepositoryClient extends BaseClient {
    constructor(namespace: string, eventHandler: IClientEvents, dataStore: DataStore, logger: Logger) {
        super(namespace, eventHandler, dataStore, logger);    
    }
    public static create(namespace: string, eventHandler: IClientEvents, dataStore: DataStore, logger: Logger): RepositoryClient {
        return new RepositoryClient(namespace, eventHandler, dataStore, logger);
    }
    override canPublish(): boolean {
        return true;
    }
    notifyObjectsCreated(objects: ObjectCreateInterface[]): void {
        objects.forEach((o)=>{
            o.key = this.namespace + "." + o.key;
        });
        DLOG(this.getLogger(), LogLevel.INFO, "RepositoryClient", `Objects Created\nItems\n${JSON.stringify(objects)}`);

        let data = DataSerializer.buildPacket(PacketType.APP_OBJECT_CREATE, DataSerializer.serializeObjectCreate, objects);
        this.sendTCPData(data);
    }
    notifyObjectsDeleted(objects: number[]): void {
        DLOG(this.getLogger(), LogLevel.INFO, "RepositoryClient", `Objects Deleted\nItems\n${JSON.stringify(keyNames(objects))}`);

        let data = DataSerializer.buildPacket(PacketType.APP_OBJECT_DELETE, DataSerializer.serializeParamArray, objects);
        this.sendTCPData(data);
    }
    notifyParametersPublished(params: PropertyPublishInterface[]): void {
        let ds = this.getDataStore();
        params.forEach((o)=>{
            o.key = this.namespace + "." + o.key;
            let id = keyFromString(o.key);
            let defaultValue = PropValue.getDefault(o.type);
            ds.setPropMeta(id, { type: o.type, bRemote: false, bReadOnly: o.readonly, bEvent: o.bEvent });
            if(!ds.hasProp(id)) 
	            ds.createProp(id, defaultValue);
        });
        DLOG(this.getLogger(), LogLevel.INFO, "RepositoryClient", `Parameters published\nItems\n${JSON.stringify(params)}`);

        let data = DataSerializer.buildPacket(PacketType.APP_PARAM_PUBLISH, DataSerializer.serializeParamPublish, params);
        this.sendTCPData(data);
    }
    notifyParametersRetracted(params: number[]): void {
        DLOG(this.getLogger(), LogLevel.INFO, "RepositoryClient", `Objects Deleted\nItems\n${JSON.stringify(keyNames(params))}`);

        let data = DataSerializer.buildPacket(PacketType.APP_PARAM_RETRACT, DataSerializer.serializeParamArray, params);
        this.sendTCPData(data);
    }
}