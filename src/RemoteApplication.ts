import { PropValue } from "./PropValue";
import { BaseClient } from "./BaseClient";
import { keyFromString, KeyOrString } from "./KeyOrString";
import { PropertySubscribeInterface } from "./DataTypes";
import { DataStore } from "./DataStore";

export type GetSubscriptionProps = (key: string, defaultValue: PropValue) => PropertySubscribeInterface;
export class RemoteObject {
    constructor(
        private m_strObjectKey: string,
        private m_pApp: RemoteApplication
    ) {}

    getProp(key: string): PropValue {
        return this.m_pApp.getProp(this.getPropKey(key));
    }

    getPropKey(key: string): number {
        const propKey = `${this.m_strObjectKey}.${key}`;
        return this.m_pApp.getPropKey(propKey);
    }

    setProp(key: string, value: PropValue): void {
        const propKey = `${this.m_strObjectKey}.${key}`;
        this.m_pApp.setProp(propKey, value);
    }

    getApp(): RemoteApplication {
        return this.m_pApp;
    }
}

export class RemoteApplication {
    private m_fnGetSubscriptionProps?: GetSubscriptionProps;

    private constructor(
        private m_strNS: string,
        private m_pClient: BaseClient
    ) {}

    static create(ns: string, pClient: BaseClient): RemoteApplication {
        const app = new RemoteApplication(ns, pClient);
        return app;
    }

    setSubscriptionPropsHandler(fn: GetSubscriptionProps): void {
        this.m_fnGetSubscriptionProps = fn;
    }

    getObject(key: string): RemoteObject {
        const objectKey = `${this.m_strNS}.${key}`;
        const id = keyFromString(objectKey);
        if (!this.m_pClient.getDataStore().hasObject(id)) {
            // Optional: throw if object not found
        }
        return new RemoteObject(key, this);
    }

    getProp(id: number): PropValue {
        this.createSubscriptionIfNeeded(id);
        return this.m_pClient.getDataStore().getProp(id);
    }

    private createSubscriptionIfNeeded(id: number): boolean {
        const bSubscriptionSent = this.m_pClient.isSubscriptionSent(id);
        if (!bSubscriptionSent && this.m_fnGetSubscriptionProps) {
            const propFullKey = new KeyOrString(id).toString();
            const propKey = propFullKey.substring(this.m_strNS.length + 1);
            const defaultValue = new PropValue();
            const subscribeProps: PropertySubscribeInterface = this.m_fnGetSubscriptionProps(propKey, defaultValue);

            subscribeProps.key = id;
            this.m_pClient.subscribeParameters([subscribeProps]);

            if (!this.m_pClient.getDataStore().hasProp(id)) {
                this.m_pClient.getDataStore().setPropMeta(id, {
                    type: defaultValue.getType(),
                    bReadOnly: false,
                    bRemote: false,
                    bEvent: false,
                });
                this.m_pClient.getDataStore().putProp(id, defaultValue);
            }
            return true;
        }
        return false;
    }

    getPropByKey(key: string): PropValue {
        return this.getProp(this.getPropKey(key));
    }

    getPropKey(key: string): number {
        const propKey = `${this.m_strNS}.${key}`;
        return keyFromString(propKey);
    }

    setProp(key: string, value: PropValue): void {
        this.m_pClient.onParamValueChange(this.getPropKey(key), value);
    }

    client(): BaseClient {
        return this.m_pClient;
    }

    getDataStore(): DataStore {
        return this.m_pClient.getDataStore();
    }
}
