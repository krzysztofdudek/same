import { ChildProcess, exec } from "child_process";
import { setTimeout } from "timers/promises";
import { ServiceProvider } from "./service-provider.js";
import { Logger } from "./logger.js";

export namespace Shell {
    export const iShellServiceKey = "Shell.IShell";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iShellServiceKey,
            () =>
                new Shell(
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create(iShellServiceKey)
                )
        );
    }

    export interface ICommandExecutionResult {
        exitCode: number;
        stdout: string;
        stderr: string;
    }

    export interface IProcess {
        kill(): void;
        isRunning(): boolean;
    }

    export interface IShell {
        runProcess(command: string): IProcess;
        executeCommand(command: string): Promise<ICommandExecutionResult>;
        isWindows(): boolean;
    }

    export class Process implements IProcess {
        public constructor(private process: ChildProcess) {}

        isRunning(): boolean {
            return this.process.exitCode !== undefined;
        }

        kill(): void {
            this.process.kill();
        }
    }

    export class Shell implements IShell {
        public constructor(private logger: Logger.ILogger) {}

        runProcess(command: string): IProcess {
            const childProcess = exec(command, (error, stdout, stderr) => {
                if (error) {
                    this.logger.error(error);
                }

                if (stdout) {
                    this.logger.trace(stdout);
                }

                if (stderr) {
                    this.logger.error(stderr);
                }
            });

            return new Process(childProcess);
        }
        isWindows(): boolean {
            return process.platform === "win32";
        }
        executeCommand(command: string): Promise<ICommandExecutionResult> {
            return new Promise((resolve) => {
                let stdoutResult: string = "";
                let stderrResult: string = "";

                const process = exec(command, (_error, stdout, stderr) => {
                    stdoutResult = stdout;
                    stderrResult = stderr;
                });

                process.on("close", (exitCode) => {
                    resolve({
                        exitCode: exitCode || 0,
                        stdout: stdoutResult,
                        stderr: stderrResult,
                    });
                });
            });
        }
    }
}
