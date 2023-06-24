export interface ILoggerFactory {
    create(name: string): ILogger;
}

export interface ILogger {
    trace(message?: any, ...optionalParams: any[]): void;
    debug(message?: any, ...optionalParams: any[]): void;
    info(message?: any, ...optionalParams: any[]): void;
    warn(message?: any, ...optionalParams: any[]): void;
    error(message?: any, ...optionalParams: any[]): void;
}

export interface ILoggerOptions {
    minimalLogLevel: LogLevel;
}

export enum LogLevel {
    Trace,
    Debug,
    Information,
    Warning,
    Error
}