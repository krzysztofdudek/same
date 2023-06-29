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
                    minimalLogLevel: LogLevel.Trace,
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
        Compact,
        Extensive,
    }

    export enum LogLevel {
        Trace,
        Debug,
        Information,
        Warning,
        Error,
    }

    export class LoggerFactory implements ILoggerFactory {
        public constructor(private loggerOptions: IOptions) {}

        create(name: string): ILogger {
            return new ConsoleLogger(this.loggerOptions, name);
        }
    }

    export class ConsoleLogger implements ILogger {
        public constructor(private loggerOptions: IOptions, private name: string) {}

        trace(message?: any, ...optionalParams: any[]): void {
            if (this.loggerOptions.minimalLogLevel <= LogLevel.Trace) {
                console.log(chalk.blackBright(this.format(LogLevel.Trace, message, optionalParams)));
            }
        }
        debug(message?: any, ...optionalParams: any[]): void {
            if (this.loggerOptions.minimalLogLevel <= LogLevel.Debug) {
                console.log(chalk.grey(this.format(LogLevel.Debug, message, optionalParams)));
            }
        }
        info(message?: any, ...optionalParams: any[]): void {
            if (this.loggerOptions.minimalLogLevel <= LogLevel.Information) {
                console.log(chalk.white(this.format(LogLevel.Information, message, optionalParams)));
            }
        }
        warn(message?: any, ...optionalParams: any[]): void {
            if (this.loggerOptions.minimalLogLevel <= LogLevel.Warning) {
                console.log(chalk.bgYellow(this.format(LogLevel.Warning, message, optionalParams)));
            }
        }
        error(message?: any, ...optionalParams: any[]): void {
            if (this.loggerOptions.minimalLogLevel <= LogLevel.Error) {
                console.log(chalk.bgRedBright(this.format(LogLevel.Error, message, optionalParams)));
            }
        }
        format(logLevel: LogLevel, message: any, optionalParams: any[]): string {
            const buildMessage = `${message}${optionalParams?.length > 0 ? ` ${JSON.stringify(optionalParams)}` : ""}`;

            switch (this.loggerOptions.logFormat) {
                case LogFormat.Compact:
                    return `${this.name} - ${buildMessage}`;
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
