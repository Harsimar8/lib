/**
 * NetworkMemoryStream TypeScript Library
 * Provides binary serialization/deserialization with network byte order (big-endian)
 */

import { PropValueType } from "./DataTypes";
import { CommandType, NotificationType, PacketType } from "./NetworkPackets";
const MAGIC: number = 0xD633A5;
const SERIALIZATION_VERSION: number = 1;
/**
 * Utility functions for network byte order conversion
 */
class NetworkUtil {
    /**
     * Convert 16-bit value from network (big-endian) to host byte order
     */
    static ntohs(value: number): number {
        return ((value & 0xFF) << 8) | ((value >>> 8) & 0xFF);
    }

    /**
     * Convert 32-bit value from network (big-endian) to host byte order
     */
    static ntohl(value: number): number {
        return ((value & 0xFF) << 24) |
               (((value >>> 8) & 0xFF) << 16) |
               (((value >>> 16) & 0xFF) << 8) |
               ((value >>> 24) & 0xFF);
    }

    /**
     * Convert 64-bit value from network (big-endian) to host byte order
     */
    static ntohll(value: bigint): bigint {
        const low = Number(value & 0xFFFFFFFFn);
        const high = Number(value >> 32n);
        return BigInt(NetworkUtil.ntohl(low)) << 32n | BigInt(NetworkUtil.ntohl(high));
    }

    /**
     * Convert 16-bit value from host to network (big-endian) byte order
     */
    static htons(value: number): number {
        return NetworkUtil.ntohs(value); // Same operation for 16-bit
    }

    /**
     * Convert 32-bit value from host to network (big-endian) byte order
     */
    static htonl(value: number): number {
        return NetworkUtil.ntohl(value); // Same operation for 32-bit
    }

    /**
     * Convert 64-bit value from host to network (big-endian) byte order
     */
    static htonll(value: bigint): bigint {
        return NetworkUtil.ntohll(value); // Same operation for 64-bit
    }

    /**
     * Convert float to network byte order
     */
    static htonf(value: number): number {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setFloat32(0, value, false); // big-endian
        return view.getUint32(0, false);
    }

    /**
     * Convert from network byte order to float
     */
    static ntohf(value: number): number {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setUint32(0, value, false); // big-endian
        return view.getFloat32(0, false);
    }

    /**
     * Convert double to network byte order
     */
    static htond(value: number): bigint {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setFloat64(0, value, false); // big-endian
        return view.getBigUint64(0, false);
    }

    /**
     * Convert from network byte order to double
     */
    static ntohd(value: bigint): number {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setBigUint64(0, value, false); // big-endian
        return view.getFloat64(0, false);
    }
}

/**
 * NetworkMemoryStreamReader - Reads binary data from a buffer with network byte order
 */
export class NetworkMemoryStreamReader {
    private buffer: Uint8Array;
    private size: number;
    private offset: number;

    constructor(buffer: ArrayBuffer | Uint8Array) {
        this.buffer = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
        this.size = this.buffer.length;
        this.offset = 0;

        let magicNumb = this.readUint32();
        let magic = magicNumb >>> 8;
        if(magic != MAGIC)
            throw new Error(`Invalid data header: ${magic}`);

        let version = (magicNumb & 0xFF);
        if(version != SERIALIZATION_VERSION) {
            throw new Error(`Unsupported serialization version: ${version}`);
        }
    }

    /**
     * Checks if the required size is available in the buffer
     */
    private checkAndThrowSizeRequirement(required: number): void {
        if (required + this.offset > this.size) {
            throw new RangeError("out of range in network stream");
        }
    }
    readPacketType(): PacketType {
        let value = this.readUint16();
        return value as PacketType;
    }
    readPropValueType(): PropValueType {
        let value = this.readUint16();
        return value as PropValueType;
    }
    readNotificationType(): NotificationType {
        let value = this.readUint16();
        return value as NotificationType;
    }
    readCommandType(): CommandType {
        let value = this.readUint16();
        return value as CommandType;
    }

    /**
     * Read boolean value
     */
    readBoolean(): boolean {
        return this.readUint8() !== 0;
    }

    /**
     * Read signed 8-bit integer
     */
    readInt8(): number {
        const value = this.readUint8();
        return value > 127 ? value - 256 : value;
    }

    /**
     * Read signed 16-bit integer
     */
    readInt16(): number {
        const value = this.readUint16();
        return value > 32767 ? value - 65536 : value;
    }

    /**
     * Read signed 32-bit integer
     */
    readInt32(): number {
        const value = this.readUint32();
        return value > 2147483647 ? value - 4294967296 : value;
    }

    /**
     * Read signed 64-bit integer
     */
    readInt64(): bigint {
        const value = this.readUint64();
        return value > 9223372036854775807n ? value - 18446744073709551616n : value;
    }

    /**
     * Read unsigned 8-bit integer
     */
    readUint8(): number {
        const size = 1;
        this.checkAndThrowSizeRequirement(size);
        const value = this.buffer[this.offset];
        this.offset += size;
        return value;
    }

    /**
     * Read unsigned 16-bit integer
     */
    readUint16(): number {
        const size = 2;
        this.checkAndThrowSizeRequirement(size);
        const value = (this.buffer[this.offset] << 8) | this.buffer[this.offset + 1];
        this.offset += size;
        return value;
    }

    /**
     * Read unsigned 32-bit integer
     */
    readUint32(): number {
        const size = 4;
        this.checkAndThrowSizeRequirement(size);
        const value = (this.buffer[this.offset] << 24) |
                     (this.buffer[this.offset + 1] << 16) |
                     (this.buffer[this.offset + 2] << 8) |
                     this.buffer[this.offset + 3];
        this.offset += size;
        return value >>> 0; // Convert to unsigned
    }

    /**
     * Read unsigned 64-bit integer
     */
    readUint64(): bigint {
        const size = 8;
        this.checkAndThrowSizeRequirement(size);
        let value = 0n;
        for (let i = 0; i < 8; i++) {
            value = (value << 8n) | BigInt(this.buffer[this.offset + i]);
        }
        this.offset += size;
        return value;
    }

    /**
     * Read 32-bit float
     */
    readFloat(): number {
        const value = this.readUint32();
        return NetworkUtil.ntohf(value);
    }

    /**
     * Read 64-bit double
     */
    readDouble(): number {
        const value = this.readUint64();
        return NetworkUtil.ntohd(value);
    }

    /**
     * Read string (length-prefixed)
     */
    readString(): string {
        const length = this.readUint32();
        const bytes = this.readBytes(length);
        return new TextDecoder('ascii').decode(bytes);
    }

    /**
     * Read raw bytes
     */
    readBytes(length: number): Uint8Array {
        this.checkAndThrowSizeRequirement(length);
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
    }

    /**
     * Read vector of bytes (length-prefixed)
     */
    readByteVector(): Uint8Array {
        const length = this.readUint32();
        return this.readBytes(length);
    }

    /**
     * Get current offset
     */
    getOffset(): number {
        return this.offset;
    }

    /**
     * Check if there's more data to read
     */
    hasMore(): boolean {
        return this.offset < this.size;
    }

    /**
     * Get remaining bytes count
     */
    remaining(): number {
        return this.size - this.offset;
    }
}

/**
 * NetworkMemoryStreamWriter - Writes binary data to a buffer with network byte order
 */
export class NetworkMemoryStreamWriter {
    private buffers: Uint8Array[];
    private totalSize: number;

    constructor() {
        this.buffers = [];
        this.totalSize = 0;
        
        this.writeUint32((MAGIC << 8) | SERIALIZATION_VERSION);
    }
    writePacketType(value: PacketType): void {
        this.writeUint16(value);
    }
    writeNotificationType(value: NotificationType): void {
        this.writeUint16(value);
    }
    writeCommandType(value: CommandType): void {
        this.writeUint16(value);
    }
    
    writePropValueType(value: PropValueType): void {
        this.writeUint16(value);
    }
    /**
     * Write boolean value
     */
    writeBoolean(value: boolean): void {
        this.writeUint8(value ? 1 : 0);
    }

    /**
     * Write signed 8-bit integer
     */
    writeInt8(value: number): void {
        this.writeUint8(value & 0xFF);
    }

    /**
     * Write signed 16-bit integer
     */
    writeInt16(value: number): void {
        this.writeUint16(value & 0xFFFF);
    }

    /**
     * Write signed 32-bit integer
     */
    writeInt32(value: number): void {
        this.writeUint32(value >>> 0);
    }

    /**
     * Write signed 64-bit integer
     */
    writeInt64(value: bigint): void {
        this.writeUint64(BigInt.asUintN(64, value));
    }

    /**
     * Write unsigned 8-bit integer
     */
    writeUint8(value: number): void {
        const buffer = new Uint8Array(1);
        buffer[0] = value & 0xFF;
        this.buffers.push(buffer);
        this.totalSize += 1;
    }

    /**
     * Write unsigned 16-bit integer
     */
    writeUint16(value: number): void {
        const buffer = new Uint8Array(2);
        buffer[0] = (value >>> 8) & 0xFF;
        buffer[1] = value & 0xFF;
        this.buffers.push(buffer);
        this.totalSize += 2;
    }

    /**
     * Write unsigned 32-bit integer
     */
    writeUint32(value: number): void {
        const buffer = new Uint8Array(4);
        buffer[0] = (value >>> 24) & 0xFF;
        buffer[1] = (value >>> 16) & 0xFF;
        buffer[2] = (value >>> 8) & 0xFF;
        buffer[3] = value & 0xFF;
        this.buffers.push(buffer);
        this.totalSize += 4;
    }

    /**
     * Write unsigned 64-bit integer
     */
    writeUint64(value: bigint): void {
        const buffer = new Uint8Array(8);
        for (let i = 7; i >= 0; i--) {
            buffer[i] = Number(value & 0xFFn);
            value >>= 8n;
        }
        this.buffers.push(buffer);
        this.totalSize += 8;
    }

    /**
     * Write 32-bit float
     */
    writeFloat(value: number): void {
        const networkValue = NetworkUtil.htonf(value);
        this.writeUint32(networkValue);
    }

    /**
     * Write 64-bit double
     */
    writeDouble(value: number): void {
        const networkValue = NetworkUtil.htond(value);
        this.writeUint64(networkValue);
    }

    /**
     * Write string (length-prefixed)
     */
    writeString(value: string): void {
        const bytes = new TextEncoder().encode(value);
        this.writeUint32(bytes.length);
        this.writeBytes(bytes);
    }

    /**
     * Write raw bytes
     */
    writeBytes(value: Uint8Array): void {
        this.buffers.push(new Uint8Array(value));
        this.totalSize += value.length;
    }

    /**
     * Write vector of bytes (length-prefixed)
     */
    writeByteVector(value: Uint8Array): void {
        this.writeUint32(value.length);
        this.writeBytes(value);
    }

    /**
     * Get the written data as a single buffer
     */
    getData(): Uint8Array {
        const result = new Uint8Array(this.totalSize);
        let offset = 0;
        for (const buffer of this.buffers) {
            result.set(buffer, offset);
            offset += buffer.length;
        }
        return result;
    }

    /**
     * Get the written data as ArrayBuffer
     */
    getArrayBuffer(): ArrayBufferLike {
        return this.getData().buffer;
    }

    /**
     * Get the current size of written data
     */
    getSize(): number {
        return this.totalSize;
    }

    /**
     * Clear all written data
     */
    clear(): void {
        this.buffers = [];
        this.totalSize = 0;
    }
}

// Export utility class as well
export { NetworkUtil };