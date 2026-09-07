import { CRC32 } from "./CRC32";
import { assert } from "./Utitlity";

// Singleton map: key (CRC32) → string
class StringMap {
    private mapKeyToStr = new Map<number, string>();
    
    public get(key: number): string | undefined {
        return this.mapKeyToStr.get(key);
    }
    
    public insert(key: number, str: string): void {
        this.mapKeyToStr.set(key, str);
    }
    
    public has(key: number): boolean {
        return this.mapKeyToStr.has(key);
    }
    
    public entries(): IterableIterator<[number, string]> {
        return this.mapKeyToStr.entries();
    }
}

const g_stringMap = new StringMap();

export function keyFromString(str: string, bInsert = true): number {
    const lowerStr = str.toLowerCase();
    const key = CRC32.calc(lowerStr);
    
    if (bInsert) {
        let existing = g_stringMap.get(key);
        if (existing === undefined) {
            g_stringMap.insert(key, str);
            return key;
        } 
        existing = existing.toLowerCase();
        if (existing !== lowerStr) {
            assert(false, `Duplicate key: ${key} maps to both "${existing}" and "${lowerStr}"`);
        }
    }
    
    return key;
}

export function stringFromKey(key: number): string {
    return g_stringMap.get(key) ?? '';
}

export function keyName(key: number): string {
	return `0x${key.toString(16).padStart(8, '0')}(${stringFromKey(key)})`;
}
export function keyNames(keys: number[]): string[] {
	let vec = new Array<string>(keys.length);
    keys.forEach((value, index)=>{
        vec[index] = keyName(value);
    })
	return vec;
}
export class KeyOrString {
    private key: number;
    private str: string;
    
    constructor();
    constructor(key: number);
    constructor(str: string, bInsert?: boolean);
    constructor(value?: number | string, bInsert = true) {
        if (value === undefined) {
            this.key = 0;
            this.str = '';
        } else if (typeof value === 'number') {
            this.key = value;
            this.str = stringFromKey(value);
        } else {
            this.str = value;
            this.key = keyFromString(value, bInsert);
        }
    }
    
    public assignKey(k: number): this {
        this.key = k;
        this.str = stringFromKey(k);
        return this;
    }
    
    public assignString(s: string): this {
        this.str = s;
        this.key = keyFromString(s);
        return this;
    }
    
    public toKey(): number {
        return this.key;
    }
    
    public toString(): string {
        return this.str;
    }

}