import chalk from 'chalk';
import { ILogger, ILoggerOptions, LogLevel } from '../abstraction/logger';

export class ConsoleLogger implements ILogger {
    public constructor(private loggerOptions: ILoggerOptions) {}

    trace(message?: any, ...optionalParams: any[]): void {
        if (this.loggerOptions.minimalLogLevel >= LogLevel.Trace) {
            console.log(chalk.blackBright(`${message} ${JSON.stringify(optionalParams)}`));
        }
    }
    debug(message?: any, ...optionalParams: any[]): void {
        if (this.loggerOptions.minimalLogLevel >= LogLevel.Debug) {
            console.log(chalk.grey(`${message} ${JSON.stringify(optionalParams)}`));
        }
    }
    info(message?: any, ...optionalParams: any[]): void {
        if (this.loggerOptions.minimalLogLevel >= LogLevel.Information) {
            console.log(chalk.white(`${message} ${JSON.stringify(optionalParams)}`));
        }
    }
    warn(message?: any, ...optionalParams: any[]): void {
        if (this.loggerOptions.minimalLogLevel >= LogLevel.Warning) {
            console.log(chalk.bgYellowBright(`${message} ${JSON.stringify(optionalParams)}`));
        }
    }
    error(message?: any, ...optionalParams: any[]): void {
        if (this.loggerOptions.minimalLogLevel >= LogLevel.Error) {
            console.log(chalk.redBright(`${message} ${JSON.stringify(optionalParams)}`));
        }
    }
}