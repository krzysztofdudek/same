import { Logger } from "../../../src/infrastructure/logger.js";

export function mockLogger(configure?: (mock: LoggerMock) => void): Logger.ILogger {
    const mock = new LoggerMock();

    if (configure) {
        configure(mock);
    }

    return mock;
}

class LoggerMock implements Logger.ILogger {
    logImplementation: ((logLevel: Logger.LogLevel, message: string, optionalParams: any[]) => void) | null = null;

    trace(message?: any, ...optionalParams: any[]): void {
        if (this.logImplementation !== null) {
            this.logImplementation(Logger.LogLevel.Trace, message, optionalParams);
        }
    }
    debug(message?: any, ...optionalParams: any[]): void {
        if (this.logImplementation !== null) {
            this.logImplementation(Logger.LogLevel.Debug, message, optionalParams);
        }
    }
    info(message?: any, ...optionalParams: any[]): void {
        if (this.logImplementation !== null) {
            this.logImplementation(Logger.LogLevel.Information, message, optionalParams);
        }
    }
    warn(message?: any, ...optionalParams: any[]): void {
        if (this.logImplementation !== null) {
            this.logImplementation(Logger.LogLevel.Warning, message, optionalParams);
        }
    }
    error(message?: any, ...optionalParams: any[]): void {
        if (this.logImplementation !== null) {
            this.logImplementation(Logger.LogLevel.Error, message, optionalParams);
        }
    }
}
