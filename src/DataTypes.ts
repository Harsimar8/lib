
export function getNumberAsString(num: number, decimal: number): string {
    let str1 = num.toPrecision(decimal).toString();
    let str2 = num.toExponential(3);
    return (str1.length <= str2.length ? str1 : str2);
}
/**
 * Property value types enumeration
 */
export enum PropValueType {
    NOTHING = 0,
    BOOLEAN = 1,
    INT = 2,
    FLOAT = 3,
    DOUBLE = 4,
    STRING = 5,
    BYTEARR = 6,
    VEC3D = 7,
    VEC3 = 8,
    QUAT = 9,
    ENUM_TYPE = 10,
    PTR_TYPE = 11,
    CUSTOM_TYPE = 12,
}
export type AcceptedPropertyTypes = null|boolean|number|string|Uint8Array|Vec3D|Vec3|Quat|EnumValue;
/**
 * 3D Vector with double precision
 */
export class Vec3D {
    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    isSame(other: Vec3D, eps: number = 0.0001): boolean {
        return Math.abs(this.x - other.x) < eps &&
               Math.abs(this.y - other.y) < eps &&
               Math.abs(this.z - other.z) < eps;
    }
    toString(): string {
        return `Vec3D(${getNumberAsString(this.x, 6)}, ${getNumberAsString(this.y, 6)}, ${getNumberAsString(this.z, 6)})`;
    }
    x: number;
    y: number;
    z: number;
}

/**
 * 3D Vector with single precision
 */
export class Vec3 {
    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    isSame(other: Vec3, eps: number = 0.0001): boolean {
        return Math.abs(this.x - other.x) < eps &&
               Math.abs(this.y - other.y) < eps &&
               Math.abs(this.z - other.z) < eps;
    }
    toString(): string {
        return `Vec3(${getNumberAsString(this.x, 6)}, ${getNumberAsString(this.y, 6)}, ${getNumberAsString(this.z, 6)})`;
    }
    x: number;
    y: number;
    z: number;
}

/**
 * Quaternion
 */
export class Quat {
    constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
    isSame(other: Quat, eps: number = 0.0001): boolean {
        return Math.abs(this.x - other.x) < eps &&
               Math.abs(this.y - other.y) < eps &&
               Math.abs(this.z - other.z) < eps &&
               Math.abs(this.w - other.w) < eps;
    }
    toString(): string {
        return `Quat(${getNumberAsString(this.x, 6)}, ${getNumberAsString(this.y, 6)}, ${getNumberAsString(this.z, 6)}, ${getNumberAsString(this.w, 6)})`;
    }
    x: number;
    y: number;
    z: number;
    w: number;
}

/**
 * Enum value
 */
export class EnumValue {
    constructor(enumId: number = 0, currValue: number = 0) {
        this.enumId = enumId;
        this.currValue = currValue;
    }
    enumId: number;
    currValue: number;
}


export interface PropValueMeta {
    type: PropValueType;
	bRemote: boolean;	//flag indicating whether this property is local to application(current application is publisher) or exist in remote application
	bReadOnly: boolean;
    bEvent: boolean;
};
/**
 * Object create interface
 */
export class ObjectCreateInterface {
    constructor(key: string, initData: string) {
        this.key = key; 
        this.initData = initData;
    }
    toString(): string {
        return `ObjectCreateInterface(key=${this.key}, initData=${this.initData})`;
    }
    key: string;
    initData: string;
}

/**
 * Property publish interface
 */
export class PropertyPublishInterface {
    constructor(key: string, type: PropValueType, readonly: boolean = false, bEvent: boolean = false) {
        this.key = key;
        this.type = type;
        this.readonly = readonly;
        this.bEvent = bEvent;
    }
    toString(): string {
        return `PropertyPublishInterface(key=${this.key}, type=${this.type}, readonly=${this.readonly}, bEvent=${this.bEvent})`;
    }
    key: string;
    type: PropValueType;
    readonly: boolean;
    bEvent: boolean;
}

/**
 * Property subscribe interface
 */
export class PropertySubscribeInterface {
    constructor(key: number, dtms: number = 0, eps: number = 0.0001, reliableMedium: boolean = false) {
        this.key = key;
        this.dtms = dtms;
        this.eps = eps;
        this.reliableMedium = reliableMedium;
    }
    toString(): string {
        return `PropertySubscribeInterface(key=${this.key}, dtms=${this.dtms}, eps=${this.eps}, reliableMedium=${this.reliableMedium})`;
    }
    key: number;
    dtms: number;   //dt in milliseconds
    eps: number;
    reliableMedium: boolean;
}
export class PatternedParamSubscribeInterface {
	constructor(pattern: string, dtms: number = 0, eps: number = 0.0001, reliableMedium: boolean = false) {
        this.pattern = pattern;
        this.dtms = dtms;
        this.eps = eps;
        this.reliableMedium = reliableMedium;
    }
    toString(): string {
        return `PatternedParamSubscribeInterface(pattern=${this.pattern}, dtms=${this.dtms}, eps=${this.eps}, reliableMedium=${this.reliableMedium})`;
    }
    pattern: string;
	dtms: number;   //dt in milliseconds
	eps: number;
	reliableMedium: boolean;	//specify medium through which the data is sent
};

/**
 * Enum interface
 */
export class Enum {
    constructor(values: Array<[string, number]>) {
        this.values = values;
        this.bRemote = false; // Indicates if the enum is remote
    }
    toString(): string {
        return `Enum(values=${this.values.map(v => `${v[0]}: ${v[1]}`).join(', ')}, bRemote=${this.bRemote})`;
    }
    values: Array<[string, number]>;
    bRemote: boolean;
}

/**
 * Enum publish interface
 */
export class EnumPublishInterface {
    constructor(key: string, values: Enum) {
        this.key = key;
        this.values = values;
    }
    toString(): string {
        return `EnumPublishInterface(key=${this.key}, values=${this.values})`;
    }
    key: string;
    values: Enum;
}

/**
 * Published parameter
 */
export class PublishedParam {
    constructor(key: string, type: PropValueType, readOnly: boolean = false, bEvent: boolean = false) {
        this.paramKey = key;
        this.paramType = type;
        this.readOnly = readOnly;
        this.bEvent = bEvent;
    }
    toString(): string {
        return `PublishedParam(key=${this.paramKey}, type=${this.paramType}, readOnly=${this.readOnly}, bEvent=${this.bEvent})`;
    }
    paramKey: string;
    paramType: PropValueType;
    readOnly: boolean;
    bEvent: boolean;
}
export interface ServerInfo {
    version: string;
    server: {
        ip: string;
        udp?: {
            port: number;
        },
        tcp: {
            session?: string;
            port: number;
            tls?: boolean;
        },
        ws?: {
            webroot: string;
            port: number;
        }
    },
    client: {
        session?: string;
        ip?: string;
        udp?: {
            port: number;
        },
        tcp: {
            port: number;
        }
    }
}
export interface NetworkStats {
    bytesSent: number;
    bytesRcvd: number;
    bytesDrop: number;
    pcktsSent: number;
    pcktsRcvd: number;
    pcktsDrop: number;
    queueSize: number;
}
export interface TCPUDPStats {
    tcp: NetworkStats;
    udp: NetworkStats;
}
export interface ServerStats {
    uptime: number;
    self: TCPUDPStats;
    clients: {[key: string]: TCPUDPStats};
}
export interface ClientInfo {
    uid: string;
    appNS: string;
    tcpRemoteAddress: string;
    udpRemoteAddress: string;
    stats: TCPUDPStats;
}

export enum PSLogLevel {
    None,
    Error,
    Warning,
    Info,
    Debug
}