import chalk from "chalk";
import { ServiceProvider } from "./service-provider";

export namespace Logger {
    export const iLoggerFactoryServiceKey = "Logger.ILoggerFactory";
    export const iLoggerOptionsServiceKey = "Logger.ILoggerOptions";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iLoggerFactoryServiceKey,
            () => new LoggerFactory(serviceProvider.resolve(iLoggerOptionsServiceKey))
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

    export interface ILoggerOptions {
        minimalLogLevel: LogLevel;
    }

    export enum LogLevel {
        Trace,
        Debug,
        Information,
        Warning,
        Error,
    }

    export class LoggerFactory implements ILoggerFactory {
        public constructor(private loggerOptions: ILoggerOptions) {}

        create(name: string): ILogger {
            return new ConsoleLogger(this.loggerOptions, name);
        }
    }

    export class ConsoleLogger implements ILogger {
        public constructor(private loggerOptions: ILoggerOptions, private name: string) {}

        trace(message?: any, ...optionalParams: any[]): void {
            if (this.loggerOptions.minimalLogLevel >= LogLevel.Trace) {
                console.log(chalk.blackBright(this.format(LogLevel.Trace, message, optionalParams)));
            }
        }
        debug(message?: any, ...optionalParams: any[]): void {
            if (this.loggerOptions.minimalLogLevel >= LogLevel.Debug) {
                console.log(chalk.grey(this.format(LogLevel.Debug, message, optionalParams)));
            }
        }
        info(message?: any, ...optionalParams: any[]): void {
            if (this.loggerOptions.minimalLogLevel >= LogLevel.Information) {
                console.log(chalk.white(this.format(LogLevel.Information, message, optionalParams)));
            }
        }
        warn(message?: any, ...optionalParams: any[]): void {
            if (this.loggerOptions.minimalLogLevel >= LogLevel.Warning) {
                console.log(chalk.bgYellowBright(this.format(LogLevel.Warning, message, optionalParams)));
            }
        }
        error(message?: any, ...optionalParams: any[]): void {
            if (this.loggerOptions.minimalLogLevel >= LogLevel.Error) {
                console.log(chalk.redBright(this.format(LogLevel.Error, message, optionalParams)));
            }
        }
        format(logLevel: LogLevel, message?: any, ...optionalParams: any[]): string {
            const date = new Date();

            return `[${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}:${pad(
                date.getSeconds(),
                2
            )} | ${logLevel} | ${this.name}] ${message} ${JSON.stringify(optionalParams)}`;
        }
    }

    function pad(number: number, length: number): string {
        return String(number).padStart(length, "0");
    }
}
