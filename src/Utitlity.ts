export function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}
export function wildcmp(wild: string, str: string): boolean {
    let cp: number | null = null;
    let mp: number | null = null;
    
    let wi = 0; // index in wild
    let si = 0; // index in string
    
    while (si < str.length && wild[wi] !== '*') {
        if ((wild[wi]?.toLowerCase() !== str[si]?.toLowerCase()) && wild[wi] !== '?') {
            return false;
        }
        wi++;
        si++;
    }
    
    while (si < str.length) {
        if (wild[wi] === '*') {
            wi++;
            if (wi === wild.length) {
                return true;
            }
            mp = wi;
            cp = si + 1;
        } else if (
            wild[wi]?.toLowerCase() === str[si]?.toLowerCase() ||
            wild[wi] === '?'
        ) {
            wi++;
            si++;
        } else {
            if (mp === null || cp === null) {
                return false;
            }
            wi = mp;
            si = cp++;
        }
    }
    
    while (wild[wi] === '*') {
        wi++;
    }
    
    return wi === wild.length;
}