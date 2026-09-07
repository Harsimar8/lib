export enum LogLevel {
    DEBUG = "debug",
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}
export function DLOG(logger: Logger, level: LogLevel, namespace: string, message: string): void {
    switch (level) {
        case LogLevel.DEBUG: 
            logger.debug(`[${namespace}] ${message}`);
            break;
        case LogLevel.INFO:
            logger.info(`[${namespace}] ${message}`);
            break;
        case LogLevel.WARN:
            logger.warn(`[${namespace}] ${message}`);
            break;
        case LogLevel.ERROR:
            logger.error(`[${namespace}] ${message}`);
            break;
    }
}
export interface Logger {
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}