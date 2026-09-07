import { Enum, EnumPublishInterface, EnumValue, 
    ObjectCreateInterface, PropertyPublishInterface, PropertySubscribeInterface, 
    PropValueType, PublishedParam, Quat, Vec3, Vec3D, ClientInfo, 
    AcceptedPropertyTypes,
    PSLogLevel
} from "./DataTypes";
import { NetworkMemoryStreamReader, NetworkMemoryStreamWriter } from "./NetworkMemoryStream";
import { PacketType} from "./NetworkPackets";
import { PropValue } from "./PropValue";

/**
 * DataSerializer class for handling complex data serialization
 */
export class DataSerializer {
    private static readonly MAX_UINT16 = 65535;

    /**
     * Checks if the array size is within uint16 limits
     */
    private static readArraySize(reader: NetworkMemoryStreamReader): number {
        return reader.readUint16();
    }
    private static writeArraySize(writer: NetworkMemoryStreamWriter, count: number): void {
        if (count >= DataSerializer.MAX_UINT16) {
            throw new Error("size must not exceed uint16 max");
        }
        return writer.writeUint16(count);
    }
    /**
     * Reads an array of primitive type T from the network stream
     */
    private static readArray<T>(
        reader: NetworkMemoryStreamReader,
        readFunc: () => T
    ): T[] {
        const count = DataSerializer.readArraySize(reader);
        const values: T[] = [];
        for (let i = 0; i < count; i++) {
            values.push(readFunc());
        }
        return values;
    }

    /**
     * Writes an array of primitive type T to the network stream
     */
    private static writeArray<T>(
        writer: NetworkMemoryStreamWriter,
        values: T[],
        writeFunc: (value: T) => void
    ): void {
        DataSerializer.writeArraySize(writer, values.length);
        for (const value of values) {
            writeFunc(value);
        }
    }

    /**
     * Read array of Vec3D
     */
    private static readVec3DArray(reader: NetworkMemoryStreamReader): Vec3D[] {
        const count = DataSerializer.readArraySize(reader);
        const values: Vec3D[] = [];
        for (let i = 0; i < count; i++) {
            values.push(new Vec3D (
                reader.readDouble(),
                reader.readDouble(),
                reader.readDouble()
            ));
        }
        return values;
    }

    /**
     * Write array of Vec3D
     */
    private static writeVec3DArray(writer: NetworkMemoryStreamWriter, values: Vec3D[]): void {
        DataSerializer.writeArraySize(writer, values.length);
        for (const v of values) {
            writer.writeDouble(v.x);
            writer.writeDouble(v.y);
            writer.writeDouble(v.z);
        }
    }

    /**
     * Read array of Vec3
     */
    private static readVec3Array(reader: NetworkMemoryStreamReader): Vec3[] {
        const count = DataSerializer.readArraySize(reader);
        const values: Vec3[] = [];
        for (let i = 0; i < count; i++) {
            values.push(new Vec3(
                reader.readFloat(),
                reader.readFloat(),
                reader.readFloat()
            ));
        }
        return values;
    }

    /**
     * Write array of Vec3
     */
    private static writeVec3Array(writer: NetworkMemoryStreamWriter, values: Vec3[]): void {
        DataSerializer.writeArraySize(writer, values.length);
        for (const v of values) {
            writer.writeFloat(v.x);
            writer.writeFloat(v.y);
            writer.writeFloat(v.z);
        }
    }

    /**
     * Read array of Quat
     */
    private static readQuatArray(reader: NetworkMemoryStreamReader): Quat[] {
        const count = DataSerializer.readArraySize(reader);
        const values: Quat[] = [];
        for (let i = 0; i < count; i++) {
            values.push(new Quat(
                reader.readFloat(),
                reader.readFloat(),
                reader.readFloat(),
                reader.readFloat()
            ));
        }
        return values;
    }

    /**
     * Write array of Quat
     */
    private static writeQuatArray(writer: NetworkMemoryStreamWriter, values: Quat[]): void {
        DataSerializer.writeArraySize(writer, values.length);
        for (const v of values) {
            writer.writeFloat(v.x);
            writer.writeFloat(v.y);
            writer.writeFloat(v.z);
            writer.writeFloat(v.w);
        }
    }

    /**
     * Read array of EnumValue
     */
    private static readEnumValueArray(reader: NetworkMemoryStreamReader): EnumValue[] {
        const count = DataSerializer.readArraySize(reader);
        const values: EnumValue[] = [];
        for (let i = 0; i < count; i++) {
            values.push(new EnumValue(
                reader.readUint32(),
                reader.readInt32()
            ));
        }
        return values;
    }

    /**
     * Write array of EnumValue
     */
    private static writeEnumValueArray(writer: NetworkMemoryStreamWriter, values: EnumValue[]): void {
        DataSerializer.writeArraySize(writer, values.length);
        for (const v of values) {
            writer.writeUint32(v.enumId);
            writer.writeInt32(v.currValue);
        }
    }

    /**
     * Serialize object create data
     */
    static serializeObjectCreate(writer: NetworkMemoryStreamWriter, objects: ObjectCreateInterface[]): void {
        DataSerializer.writeArraySize(writer, objects.length);
        for (const obj of objects) {
            writer.writeString(obj.key);
            writer.writeString(obj.initData);
        }
    }

    /**
     * Deserialize object create data
     */
    static deserializeObjectCreate(reader: NetworkMemoryStreamReader): ObjectCreateInterface[] {
        const count = DataSerializer.readArraySize(reader);
        const objects: ObjectCreateInterface[] = [];
        for (let i = 0; i < count; i++) {
            objects.push({
                key: reader.readString(),
                initData: reader.readString()
            });
        }
        return objects;
    }

    /**
     * Serialize parameter publish data
     */
    static serializeParamPublish(writer: NetworkMemoryStreamWriter, params: PropertyPublishInterface[]): void {
        DataSerializer.writeArraySize(writer, params.length);
        for (const param of params) {
            writer.writeString(param.key);
            writer.writePropValueType(param.type);
            writer.writeBoolean(param.readonly);
            writer.writeBoolean(param.bEvent);
        }
    }

    /**
     * Deserialize parameter publish data
     */
    static deserializeParamPublish(reader: NetworkMemoryStreamReader): PropertyPublishInterface[] {
        const count = DataSerializer.readArraySize(reader);
        const params: PropertyPublishInterface[] = [];
        for (let i = 0; i < count; i++) {
            params.push({
                key: reader.readString(),
                type: reader.readPropValueType(),
                readonly: reader.readBoolean(),
                bEvent: reader.readBoolean(),
            });
        }
        return params;
    }

    /**
     * Serialize parameter subscribe data
     */
    static serializeParamSubscribe(writer: NetworkMemoryStreamWriter, params: PropertySubscribeInterface[]): void {
        DataSerializer.writeArraySize(writer, params.length);
        for (const param of params) {
            writer.writeUint32(param.key);
            writer.writeUint32(param.dtms);
            writer.writeDouble(param.eps);
            writer.writeBoolean(param.reliableMedium);
        }
    }

    /**
     * Deserialize parameter subscribe data
     */
    static deserializeParamSubscribe(reader: NetworkMemoryStreamReader): PropertySubscribeInterface[] {
        const count = DataSerializer.readArraySize(reader);
        const params: PropertySubscribeInterface[] = [];
        for (let i = 0; i < count; i++) {
            params.push(new PropertySubscribeInterface(
                reader.readUint32(),
                reader.readUint32(),
                reader.readDouble(),
                reader.readBoolean()
            ));
        }
        return params;
    }

    /**
     * Serialize enum publish data
     */
    static serializeEnumPublish(writer: NetworkMemoryStreamWriter, enums: EnumPublishInterface[]): void {
        DataSerializer.writeArraySize(writer, enums.length);
        for (const enumObj of enums) {
            writer.writeString(enumObj.key);
            DataSerializer.writeArraySize(writer, enumObj.values.values.length);
            for (const [name, value] of enumObj.values.values) {
                writer.writeString(name);
                writer.writeInt32(value);
            }
        }
    }

    /**
     * Deserialize enum publish data
     */
    static deserializeEnumPublish(reader: NetworkMemoryStreamReader): EnumPublishInterface[] {
        const count = DataSerializer.readArraySize(reader);
        const enums: EnumPublishInterface[] = [];
        for (let i = 0; i < count; i++) {
            const key = reader.readString();
            const valueCount = reader.readUint16();
            const values: Array<[string, number]> = [];
            for (let j = 0; j < valueCount; j++) {
                const enumName = reader.readString();
                const enumValue = reader.readInt32();
                values.push([enumName, enumValue]);
            }
            enums.push(new EnumPublishInterface(
                key,
                new Enum(values)
            ));
        }
        return enums;
    }

    /**
     * Serialize published enums
     */
    static serializePublishedEnums(writer: NetworkMemoryStreamWriter, enums: Array<[string, Enum]>): void {
        DataSerializer.writeArraySize(writer, enums.length);
        for (const [key, enumObj] of enums) {
            writer.writeString(key);
            DataSerializer.writeArraySize(writer, enumObj.values.length);
            for (const [name, value] of enumObj.values) {
                writer.writeString(name);
                writer.writeInt32(value);
            }
        }
    }

    /**
     * Deserialize published enums
     */
    static deserializePublishedEnums(reader: NetworkMemoryStreamReader): Array<[string, Enum]> {
        const count = DataSerializer.readArraySize(reader);
        const enums: Array<[string, Enum]> = [];
        for (let i = 0; i < count; i++) {
            const key = reader.readString();
            const valueCount = DataSerializer.readArraySize(reader);
            const values: Array<[string, number]> = [];
            for (let j = 0; j < valueCount; j++) {
                const enumName = reader.readString();
                const enumValue = reader.readInt32();
                values.push([enumName, enumValue]);
            }
            enums.push([key, new Enum(values)]);
        }
        return enums;
    }

    /**
     * Serialize parameter array
     */
    static serializeParamArray(writer: NetworkMemoryStreamWriter, params: number[]): void {
        DataSerializer.writeArray(writer, params, (value) => writer.writeUint32(value));
    }

    /**
     * Deserialize parameter array
     */
    static deserializeParamArray(reader: NetworkMemoryStreamReader): number[] {
        return DataSerializer.readArray(reader, () => reader.readUint32());
    }

    /**
     * Serialize string array
     */
    static serializeStringArray(writer: NetworkMemoryStreamWriter, params: string[]): void {
        DataSerializer.writeArray(writer, params, (value) => writer.writeString(value));
    }

    /**
     * Deserialize string array
     */
    static deserializeStringArray(reader: NetworkMemoryStreamReader): string[] {
        return DataSerializer.readArray(reader, () => reader.readString());
    }

    /**
     * Serialize object init response data
     */
    static serializeObjectInitResponseData(writer: NetworkMemoryStreamWriter, objectKeys: number[], objectInitData: string[]): void {
        DataSerializer.writeArraySize(writer, objectKeys.length);
        for (let i = 0; i < objectKeys.length; i++) {
            writer.writeUint32(objectKeys[i]);
            writer.writeString(objectInitData[i]);
        }
    }

    /**
     * Deserialize object init response data
     */
    static deserializeObjectInitResponseData(reader: NetworkMemoryStreamReader): Map<number, string> {
        const count = DataSerializer.readArraySize(reader);
        const objectsInitData = new Map<number, string>();
        for (let i = 0; i < count; i++) {
            const objectKey = reader.readUint32();
            const objectInitData = reader.readString();
            objectsInitData.set(objectKey, objectInitData);
        }
        return objectsInitData;
    }

    /**
     * Serialize published param
     */
    static serializePublishedParam(writer: NetworkMemoryStreamWriter, publishedParams: PublishedParam[]): void {
        DataSerializer.writeArraySize(writer, publishedParams.length);
        for (const param of publishedParams) {
            writer.writeString(param.paramKey);
            writer.writePropValueType(param.paramType);
            writer.writeBoolean(param.readOnly);
            writer.writeBoolean(param.bEvent);
        }
    }

    /**
     * Deserialize published param
     */
    static deserializePublishedParam(reader: NetworkMemoryStreamReader): PublishedParam[] {
        const count = DataSerializer.readArraySize(reader);
        const publishedParams: PublishedParam[] = [];
        for (let i = 0; i < count; i++) {
            publishedParams.push({
                paramKey: reader.readString(),
                paramType: reader.readPropValueType(),
                readOnly: reader.readBoolean(),
                bEvent: reader.readBoolean()
            });
        }
        return publishedParams;
    }

    /**
     * Serialize request response
     */
    static serializeRequestResponse(writer: NetworkMemoryStreamWriter, context: number, data: Uint8Array): void {
        writer.writeUint32(context);
        writer.writeByteVector(data);
    }
    static serializeUint8Array(writer: NetworkMemoryStreamWriter, data: Uint8Array): void {
        writer.writeByteVector(data);
    }
    /**
     * Deserialize request response
     */
    static deserializeRequestResponse(reader: NetworkMemoryStreamReader): { context: number; data: Uint8Array } {
        return {
            context: reader.readUint32(),
            data: reader.readByteVector()
        };
    }
    static serializeStringPropsMap(writer: NetworkMemoryStreamWriter, map: Map<string, number[]>) {
        writer.writeUint32(map.size);
        for (const [k, v] of map.entries()) {
            writer.writeString(k);
            const keys = Array.from(v);
            DataSerializer.writeArray(writer, keys, (value) => writer.writeUint32(value));
        }
    }

    static deserializeStringPropsMap(reader: NetworkMemoryStreamReader): Map<string, number[]> {
        let map: Map<string, number[]> = new Map<string, number[]>();
        const count = DataSerializer.readArraySize(reader);
        for (let i = 0; i < count; ++i) {
            const publisher = reader.readString();
            const keys = DataSerializer.readArray(reader, ()=>reader.readUint32());
            map.set(publisher, keys);
        }
        return map;
    }
    static serializeString(writer: NetworkMemoryStreamWriter, str: string): void {
        return writer.writeString(str);
    }
    static deserializeString(reader: NetworkMemoryStreamReader): string {
        return reader.readString();
    }
    static serializeClients(writer: NetworkMemoryStreamWriter, clients: ClientInfo[]): void {
        writer.writeUint32(clients.length);
        for (const tp of clients) {
            writer.writeString(tp.uid);
            writer.writeString(tp.appNS);
            writer.writeString(tp.tcpRemoteAddress);
            writer.writeString(tp.udpRemoteAddress);
        }
    }

    static deserializeClients(reader: NetworkMemoryStreamReader): ClientInfo[] {
        let clients: ClientInfo[] = [] 
        const sz = DataSerializer.readArraySize(reader);
        for (let i = 0; i < sz; ++i) {
            let c: ClientInfo = {
                uid: reader.readString(), 
                appNS: reader.readString(), 
                tcpRemoteAddress: reader.readString(), 
                udpRemoteAddress: reader.readString(),
                stats: null
            };
            clients.push(c);
        }
        return clients;
    }

    static serializeClientsSubscriptions(writer: NetworkMemoryStreamWriter, clientsSubscriptions: Map<string, PropertySubscribeInterface[]>): void {
        writer.writeUint32(clientsSubscriptions.size);
        for (const [clientNS, subscriptions] of clientsSubscriptions.entries()) {
            writer.writeString(clientNS);
            writer.writeUint32(subscriptions.length);
            for (const subs of subscriptions) {
                writer.writeUint32(subs.key);
                writer.writeUint32(subs.dtms);
                writer.writeDouble(subs.eps);
                writer.writeBoolean(subs.reliableMedium);
            }
        }
    }

    static deserializeClientsSubscriptions(reader: NetworkMemoryStreamReader): Map<string, PropertySubscribeInterface[]> {
        let clientsSubscriptions: Map<string, PropertySubscribeInterface[]> = new Map<string, PropertySubscribeInterface[]>();
        const sz = DataSerializer.readArraySize(reader);
        for (let i = 0; i < sz; ++i) {
            const clientNS = reader.readString();
            const subsCount = DataSerializer.readArraySize(reader);
            const subscriptions: PropertySubscribeInterface[] = [];
            for (let j = 0; j < subsCount; ++j) {
                const subs: PropertySubscribeInterface = {
                    key: reader.readUint32(),
                    dtms: reader.readUint32(),
                    eps: reader.readDouble(),
                    reliableMedium: reader.readBoolean()
                };
                subscriptions.push(subs);
            }
            clientsSubscriptions.set(clientNS, subscriptions);
        }
        return clientsSubscriptions;
    }
    
	static serializeLogLevel(writer: NetworkMemoryStreamWriter, clientId: string, key: string, ll: PSLogLevel) {
        writer.writeString(clientId);
        writer.writeString(key);
        writer.writeUint16(ll);
    }
	static deserializeLogLevel(reader: NetworkMemoryStreamReader): {clientId: string, key: string, ll: PSLogLevel} {
        let ret = {
            clientId: reader.readString(), 
            key: reader.readString(),
            ll: reader.readUint16() as PSLogLevel
        }
        return ret;
    }
    static serializeDataForRemoteApp(writer: NetworkMemoryStreamWriter, fromUID: string, toUID: string, data: Uint8Array): void {
        writer.writeString(fromUID);
        writer.writeString(toUID);
        writer.writeByteVector(data);
    }
    static deserializeDataForRemoteApp(reader: NetworkMemoryStreamReader): {fromUID: string, toUID: string, data: Uint8Array} {
        let data = {
            fromUID: reader.readString(),
            toUID: reader.readString(),
            data: reader.readByteVector()
        };
        return data;
    }
    /**
     * Convert array to PropValue array
     */
    private static convertToPropValueVector(values: AcceptedPropertyTypes[], type: PropValueType): PropValue[] {
        return values.map(value => new PropValue(value as AcceptedPropertyTypes, type));
    }

    /**
     * Convert PropValue array to typed array
     */
    private static convertFromPropValueVector<T>(propValues: PropValue[]): T[] {
        return propValues.map(propValue => propValue.get<T>());
    }

    private static readCustomProps(reader: NetworkMemoryStreamReader): PropValue[] {
        const customTypes = DataSerializer.readArray(reader, () => reader.readUint32());
        const dataArr = DataSerializer.readArray(reader, () =>reader.readByteVector());
        let values: PropValue[] = [];
        for(let i = 0; i < customTypes.length; ++i) {
            values[i] = new PropValue(dataArr[i], PropValueType.CUSTOM_TYPE, customTypes[i]);
        }
        return values;
    }
    private static writeCustomProps(writer: NetworkMemoryStreamWriter, propValues: PropValue[]): void {
        let customTypes: number[] = [];
        propValues.forEach((item)=>customTypes.push(item.isCustomType()));
        DataSerializer.writeArray(writer, customTypes, (value)=>writer.writeUint32(value));
        const values = DataSerializer.convertFromPropValueVector<Uint8Array>(propValues);
        DataSerializer.writeArray(writer, values, (value) => writer.writeByteVector(value));
    }
    /**
     * Serialize property update
     */
    static serializePropUpdate(writer: NetworkMemoryStreamWriter, propType: PropValueType, paramKeys: number[], propValues: PropValue[]): void {
        if(paramKeys.length != propValues.length)
            throw new Error("Size Mismatch while serializing prop update");
        writer.writePropValueType(propType);
        DataSerializer.serializeParamArray(writer, paramKeys);

        switch (propType) {
            case PropValueType.NOTHING: {
                const values = new Array(propValues.length).fill(false);
                DataSerializer.writeArray(writer, values, (value) => writer.writeBoolean(value));
                break;
            }
            case PropValueType.BOOLEAN: {
                const values = DataSerializer.convertFromPropValueVector<boolean>(propValues);
                DataSerializer.writeArray(writer, values, (value) => writer.writeBoolean(value));
                break;
            }
            case PropValueType.INT: {
                const values = DataSerializer.convertFromPropValueVector<number>(propValues);
                DataSerializer.writeArray(writer, values, (value) => writer.writeInt32(value));
                break;
            }
            case PropValueType.FLOAT: {
                const values = DataSerializer.convertFromPropValueVector<number>(propValues);
                DataSerializer.writeArray(writer, values, (value) => writer.writeFloat(value));
                break;
            }
            case PropValueType.DOUBLE: {
                const values = DataSerializer.convertFromPropValueVector<number>(propValues);
                DataSerializer.writeArray(writer, values, (value) => writer.writeDouble(value));
                break;
            }
            case PropValueType.STRING: {
                const values = DataSerializer.convertFromPropValueVector<string>(propValues);
                DataSerializer.writeArray(writer, values, (value) => writer.writeString(value));
                break;
            }
            case PropValueType.BYTEARR: {
                const values = DataSerializer.convertFromPropValueVector<Uint8Array>(propValues);
                DataSerializer.writeArray(writer, values, (value) => writer.writeByteVector(value));
                break;
            }
            case PropValueType.CUSTOM_TYPE: {
                DataSerializer.writeCustomProps(writer, propValues);
                break;
            }
            case PropValueType.VEC3D: {
                const values = DataSerializer.convertFromPropValueVector<Vec3D>(propValues);
                DataSerializer.writeVec3DArray(writer, values);
                break;
            }
            case PropValueType.VEC3: {
                const values = DataSerializer.convertFromPropValueVector<Vec3>(propValues);
                DataSerializer.writeVec3Array(writer, values);
                break;
            }
            case PropValueType.QUAT: {
                const values = DataSerializer.convertFromPropValueVector<Quat>(propValues);
                DataSerializer.writeQuatArray(writer, values);
                break;
            }
            case PropValueType.ENUM_TYPE: {
                const values = DataSerializer.convertFromPropValueVector<EnumValue>(propValues);
                DataSerializer.writeEnumValueArray(writer, values);
                break;
            }
        }
    }

    /**
     * Deserialize property update
     */
    static deserializePropUpdate(reader: NetworkMemoryStreamReader): { paramKeys: number[]; propValues: PropValue[] } {
        const propType = reader.readPropValueType();
        const paramKeys = DataSerializer.deserializeParamArray(reader);
        let propValues: PropValue[] = [];

        switch (propType) {
            case PropValueType.NOTHING: {
                const values = DataSerializer.readArray(reader, () => reader.readBoolean());
                propValues = values.map(() => new PropValue());
                break;
            }
            case PropValueType.BOOLEAN: {
                const values = DataSerializer.readArray(reader, () => reader.readBoolean());
                propValues = DataSerializer.convertToPropValueVector(values, PropValueType.BOOLEAN);
                break;
            }
            case PropValueType.INT: {
                const values = DataSerializer.readArray(reader, () => reader.readInt32());
                propValues = DataSerializer.convertToPropValueVector(values, PropValueType.INT);
                break;
            }
            case PropValueType.FLOAT: {
                const values = DataSerializer.readArray(reader, () => reader.readFloat());
                propValues = DataSerializer.convertToPropValueVector(values, PropValueType.FLOAT);
                break;
            }
            case PropValueType.DOUBLE: {
                const values = DataSerializer.readArray(reader, () => reader.readDouble());
                propValues = DataSerializer.convertToPropValueVector(values, PropValueType.DOUBLE);
                break;
            }
            case PropValueType.STRING: {
                const values = DataSerializer.readArray(reader, () => reader.readString());
                propValues = DataSerializer.convertToPropValueVector(values, PropValueType.STRING);
                break;
            }
            case PropValueType.BYTEARR: {
                const values = DataSerializer.readArray(reader, () => reader.readByteVector());
                propValues = DataSerializer.convertToPropValueVector(values, PropValueType.BYTEARR);
                break;
            }
            case PropValueType.CUSTOM_TYPE: {
                propValues = DataSerializer.readCustomProps(reader);
                break;
            }
            case PropValueType.VEC3D: {
                const values = DataSerializer.readVec3DArray(reader);
                propValues = DataSerializer.convertToPropValueVector(values, PropValueType.VEC3D);
                break;
            }
            case PropValueType.VEC3: {
                const values = DataSerializer.readVec3Array(reader);
                propValues = DataSerializer.convertToPropValueVector(values, PropValueType.VEC3);
                break;
            }
            case PropValueType.QUAT: {
                const values = DataSerializer.readQuatArray(reader);
                propValues = DataSerializer.convertToPropValueVector(values, PropValueType.QUAT);
                break;
            }
            case PropValueType.ENUM_TYPE: {
                const values = DataSerializer.readEnumValueArray(reader);
                propValues = DataSerializer.convertToPropValueVector(values, PropValueType.ENUM_TYPE);
                break;
            }
        }
        if(paramKeys.length != propValues.length)
            throw new Error("Size Mismatch while deserializing prop update");

        return { paramKeys, propValues };
    }

    static buildPacket(packetType: PacketType, fn: (writer: NetworkMemoryStreamWriter, ...args: any[]) => void, ...args: any[]): Uint8Array {
        const writer = new NetworkMemoryStreamWriter();
        writer.writePacketType(packetType);
        fn(writer, ...args);
        return writer.getData();
    }
    static buildEmptyPacket(packetType: PacketType): Uint8Array {
        const writer = new NetworkMemoryStreamWriter();
        writer.writePacketType(packetType);
        return writer.getData();
    }
    static parsePacket<T>(data: Uint8Array, expectedType: PacketType, fn: (reader: NetworkMemoryStreamReader) => T): T {
        const reader = new NetworkMemoryStreamReader(data);
        const packetType = reader.readPacketType();
        if (packetType !== expectedType) {
            throw new Error(`Unexpected packet type: ${packetType}`);
        }
        return fn(reader);
    }
}