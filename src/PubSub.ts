import { BaseClient, IClientEvents } from "./BaseClient";
import { IDataSender } from "./DataHandler";
import { DataStore } from "./DataStore";
import { DebugClient, IDebugClientEvents } from "./DebugClient";
import { Logger } from "./Logger";
import { RepositoryClient } from "./RepositoryClient";
import { WSService } from "./WSService";

export class PubSub {
    private client: BaseClient;
    private ds: DataStore;
    private wsService: WSService;
    public constructor(private namespace: string, private logger: Logger) {
        this.ds = new DataStore();
    }
    public connectToWSService(url: string): WSService {
        if(!this.client) {
            throw new Error("Client must be created before WSService");
        }
        this.wsService = new WSService(url, this.logger, this.client.getDataHandler());
        this.client.setDataSender(this.wsService);
        return this.wsService;  
    }
    public connectToWebRTC(): void {
        this.wsService.createWebRTCSignalar();
    }
    public createClient(eventHandler: IClientEvents): BaseClient {
        this.client = BaseClient.create(this.namespace, eventHandler, this.ds, this.logger);
        this.client.initialize({});
        return this.client;
    }   
    public createRepositoryClient(eventHandler: IClientEvents): RepositoryClient {
        let client = RepositoryClient.create(this.namespace, eventHandler, this.ds, this.logger);
        client.initialize({});
        this.client = client;
        return client;
    }
    public createDebugClient(eventHandler: IDebugClientEvents): DebugClient {
        let client = DebugClient.create(this.namespace, eventHandler, this.ds, this.logger);
        client.initialize({});
        this.client = client;
        return client;
    }
    public dataStore(): DataStore {
        return this.ds;
    }
}