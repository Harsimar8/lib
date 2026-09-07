export class CRC32 {
    private static table: number[] = CRC32.generateTable();
    
    private static generateTable(): number[] {
        const table = new Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[n] = c >>> 0;
        }
        return table;
    }
    
    public static calc(str: string): number {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < str.length; i++) {
            const byte = str.charCodeAt(i);
            crc = (crc >>> 8) ^ this.table[(crc ^ byte) & 0xFF];
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }
}