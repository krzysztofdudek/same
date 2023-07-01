import chalk from "chalk";
import { ServiceProvider } from "./service-provider.js";

export namespace Logger {
    export const iLoggerFactoryServiceKey = "Logger.ILoggerFactory";
    export const iOptionsServiceKey = "Logger.IOptions";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iOptionsServiceKey,
            () =>
                <IOptions>{
                    minimalLogLevel: LogLevel.Information,
                    logFormat: LogFormat.Compact,
                }
        );

        serviceProvider.registerSingleton(
            iLoggerFactoryServiceKey,
            () => new LoggerFactory(serviceProvider.resolve(iOptionsServiceKey))
        );
    }

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

    export interface IOptions {
        minimalLogLevel: LogLevel;
        logFormat: LogFormat;
    }

    export enum LogFormat {
        Compact = "Compact",
        Extensive = "Extensive",
    }

    export enum LogLevel {
        Trace = "Trace",
        Debug = "Debug",
        Information = "Information",
        Warning = "Warning",
        Error = "Error",
    }

    export class LoggerFactory implements ILoggerFactory {
        public constructor(private loggerOptions: IOptions) {}

        create(name: string): ILogger {
            return new ConsoleLogger(this.loggerOptions, name);
        }
    }

    export class ConsoleLogger implements ILogger {
        public constructor(private loggerOptions: IOptions, private name: string) {}

        private minimalLogLevelNumber() {
            switch (this.loggerOptions.minimalLogLevel) {
                case LogLevel.Trace:
                    return 0;
                case LogLevel.Debug:
                    return 1;
                case LogLevel.Information:
                    return 2;
                case LogLevel.Warning:
                    return 3;
                case LogLevel.Error:
                    return 4;
            }
        }

        trace(message?: any, ...optionalParams: any[]): void {
            if (this.minimalLogLevelNumber() <= 0) {
                console.log(chalk.blackBright(this.format(LogLevel.Trace, message, optionalParams)));
            }
        }
        debug(message?: any, ...optionalParams: any[]): void {
            if (this.minimalLogLevelNumber() <= 1) {
                console.log(chalk.grey(this.format(LogLevel.Debug, message, optionalParams)));
            }
        }
        info(message?: any, ...optionalParams: any[]): void {
            if (this.minimalLogLevelNumber() <= 2) {
                console.log(chalk.white(this.format(LogLevel.Information, message, optionalParams)));
            }
        }
        warn(message?: any, ...optionalParams: any[]): void {
            if (this.minimalLogLevelNumber() <= 3) {
                console.log(chalk.yellow(this.format(LogLevel.Warning, message, optionalParams)));
            }
        }
        error(message?: any, ...optionalParams: any[]): void {
            if (this.minimalLogLevelNumber() <= 4) {
                console.log(chalk.redBright(this.format(LogLevel.Error, message, optionalParams)));
            }
        }
        format(logLevel: LogLevel, message: any, optionalParams: any[]): string {
            const buildMessage = `${message}${optionalParams?.length > 0 ? ` ${JSON.stringify(optionalParams)}` : ""}`;

            switch (this.loggerOptions.logFormat) {
                case LogFormat.Compact:
                    return `${buildMessage}`;
                case LogFormat.Extensive:
                    const date = new Date();

                    return `[${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}:${pad(date.getSeconds(), 2)} | ${
                        LogLevel[logLevel]
                    } | ${this.name}] ${buildMessage}`;
            }
        }
    }

    function pad(number: number, length: number): string {
        return String(number).padStart(length, "0");
    }
}
