import { DataSerializer } from "./DataSerializer";
import { PropValueType } from "./DataTypes";
import { PacketType} from "./NetworkPackets";
import { PropValue } from "./PropValue";

interface Update {
  keys: number[];
  values: PropValue[];
  reliableMediums: boolean[];
}
export class DataUpdate {
    private serverUpdate: Map<number, PropValue> = new Map();
    
    onUpdateParamServer(param: number, value: PropValue): void {
        this.serverUpdate.set(param, value);
    }
    
    private collectUpdates(updates: Map<number, PropValue>): Map<PropValueType, Update> {
        const grouped = new Map<PropValueType, Update>();
        
        for (const [k, v] of updates.entries()) {
            const type = v.getType();
            const group = grouped.get(type) || { keys: [], values: [], reliableMediums: [] };
            group.keys.push(k);
            group.values.push(v);
            group.reliableMediums.push(true);
            grouped.set(type, group);
        }
        
        return grouped;
    }

    sendServerUpdates(sendFunc: (data: Uint8Array, reliable: boolean) => void): void {
        const updates = new Map(this.serverUpdate);
        this.serverUpdate.clear();
        
        const grouped = this.collectUpdates(updates);
        
        for (const [type, update] of grouped.entries()) {
            const data = DataSerializer.buildPacket(PacketType.APP_PARAM_UPDATE, DataSerializer.serializePropUpdate, type, update.keys, update.values);
            sendFunc(data, true);
        }
    }

    sendUpdates(sendFunc: (data: Uint8Array, reliable: boolean) => void): void {
        this.sendServerUpdates(sendFunc);
    }
}