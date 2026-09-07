import { DataSerializer } from "./DataSerializer";
import { PropValueMeta, Enum, PropValueType } from "./DataTypes";
import { PacketType } from "./NetworkPackets";
import { PropValue } from "./PropValue";
export type EventCallback = (key: number) => void;

export class PropEventHandler {
    private static s_id = 0;
    private m_vecListeners: Map<number, EventCallback> = new Map();

    addListener(fn: EventCallback): number {
        const id = PropEventHandler.s_id++;
        this.m_vecListeners.set(id, fn);
        return id;
    }

    removeListener(id: number): boolean {
        return this.m_vecListeners.delete(id);
    }

    dispatchEvent(key: number): void {
        for (const [, listener] of this.m_vecListeners) {
            listener(key);
        }
    }
}

export class DataStore {
    private m_props = new Map<number, PropValue>();
    private m_propsMeta = new Map<number, PropValueMeta>();
    private m_enums = new Map<number, Enum>();
    private m_objects = new Map<number, string>();
    private m_propEventHandlers = new Map<number, PropEventHandler>();

    static create(): DataStore {
        return new DataStore();
    }

    getPropType(key: number): PropValueType {
        const prop = this.m_props.get(key);
        return prop ? prop.getType() : PropValueType.NOTHING;
    }

    hasProp(key: number): boolean {
        return this.m_props.has(key);
    }

    getProp(key: number | string): PropValue {
        const k = typeof key === 'string' ? this.keyFromString(key) : key;
        return this.m_props.get(k) ?? new PropValue(undefined, PropValueType.NOTHING);
    }

    private keyFromString(str: string): number {
        // Hash or conversion logic
        return str.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    }

    setPropMeta(key: number, meta: PropValueMeta): void {
        const existing = this.m_propsMeta.get(key);
        if (!existing || !existing.bRemote) {
            this.m_propsMeta.set(key, meta);
        }
    }

    getPropMetaData(key: number): PropValueMeta {
        return this.m_propsMeta.get(key) ?? { type: PropValueType.NOTHING, bRemote: false, bReadOnly: false, bEvent: false };
    }

    createProp(key: number, value: PropValue): void {
        this.m_props.set(key, value);
    }

    putProp(key: number, value: PropValue, skipPropChangeEvent: boolean = false): number {
        const existing = this.m_props.get(key);
        const bEvent = this.m_propsMeta.get(key).bEvent ?? false;
        let ret = 0x0;
        if (existing) {
            if (!existing.isSame(value) || bEvent) {
                this.m_props.set(key, value);
                ret = 0x1;
            }
        } else {
            this.m_props.set(key, value);
            ret = 0x2;
        }
        if((ret != 0x0 || bEvent) && !skipPropChangeEvent)
            this.dispatchPropChangeEvent(key, existing, value);

        return ret;
    }

    removeProp(key: number): void {
        this.m_props.delete(key);
    }

    putEnum(key: number, e: Enum): void {
        this.m_enums.set(key, e);
    }

    removeEnum(key: number): void {
        this.m_enums.delete(key);
    }

    putObject(key: number, initData: string): void {
        this.m_objects.set(key, initData);
    }

    removeObject(key: number): void {
        this.m_objects.delete(key);
    }

    addPropChangeEventListener(key: number, fn: EventCallback): number {
        if (!this.m_propEventHandlers.has(key)) {
            this.m_propEventHandlers.set(key, new PropEventHandler());
        }
        return this.m_propEventHandlers.get(key)!.addListener(fn);
    }

    removePropChangeEventListener(key: number, handlerIdx: number): boolean {
        const handler = this.m_propEventHandlers.get(key);
        return handler ? handler.removeListener(handlerIdx) : false;
    }

    dispatchPropChangeEvent(key: number, oldValue: PropValue, newValue: PropValue): void {
        const handler = this.m_propEventHandlers.get(key);
        if (handler) {
            handler.dispatchEvent(key);
        }
    }

    hasObject(key: number): boolean {
        return this.m_objects.has(key);
    }

    getObject(key: number): string {
        return this.m_objects.get(key) ?? "";
    }

    enums(): ReadonlyMap<number, Enum> {
        return this.m_enums;
    }

    props(): ReadonlyMap<number, PropValue> {
        return this.m_props;
    }

    objects(): ReadonlyMap<number, string> {
        return this.m_objects;
    }

    buildPublishedParamsData(): Uint8Array {
        const publishedParams: { key: string; type: PropValueType; bReadOnly: boolean }[] = [];
        for (const [k, v] of this.m_props.entries()) {
            const meta = this.m_propsMeta.get(k);
            if (!meta) throw new Error("props meta not set");
            publishedParams.push({ key: k.toString(), type: meta.type, bReadOnly: meta.bReadOnly });
        }
        return DataSerializer.buildPacket(PacketType.APP_PUBLISHED_PARAMS, DataSerializer.serializePublishedParam, publishedParams);
    }

    buildPublishedEnumsData(): Uint8Array {
        const enums = Array.from(this.m_enums.entries()).map(([k, v]) => [k.toString(), v]);
        return DataSerializer.buildPacket(PacketType.APP_PUBLISHED_ENUMS, DataSerializer.serializePublishedEnums, enums);
    }

    buildPublishedObjectsData(): Uint8Array {
        return DataSerializer.buildPacket(PacketType.APP_PUBLISHED_OBJECTS, DataSerializer.serializeStringArray, Array.from(this.m_objects.keys()).map(k => k.toString()));
    }
}