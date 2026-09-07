type TimerCallback = () => void;

export class TimerThread {
    private intervalMs: number;
    private callback: TimerCallback;
    private timerId: ReturnType<typeof setTimeout>;
    private running: boolean = false;
    
    constructor(intervalMs: number, callback: TimerCallback) {
        this.intervalMs = intervalMs;
        this.callback = callback;
    }
    
    public start(): void {
        if (this.running) return;
        this.running = true;
        this.scheduleNext();
    }
    
    private scheduleNext(): void {
        if (!this.running) return;
        
        this.timerId = setTimeout(() => {
            try {
                this.callback();
            } catch (e) {
                console.error("TimerThread callback threw an error:", e);
            }
            
            this.scheduleNext(); // loop
        }, this.intervalMs);
    }
    
    public stop(): void {
        if (!this.running) return;
        this.running = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }
    
    public isRunning(): boolean {
        return this.running;
    }
    
    public setInterval(ms: number): void {
        this.intervalMs = ms;
        if (this.running) {
            this.stop();
            this.start(); // restart with new interval
        }
    }
}
