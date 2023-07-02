import { ChildProcess, exec } from "child_process";
import { setTimeout } from "timers/promises";
import { ServiceProvider } from "./service-provider.js";

export namespace Shell {
    export const iShellServiceKey = "Shell.IShell";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(iShellServiceKey, () => new Shell());
    }

    export interface ICommandExecutionResult {
        statusCode: number;
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
        runProcess(command: string): IProcess {
            const childProcess = exec(command);

            return new Process(childProcess);
        }
        isWindows(): boolean {
            return process.platform === "win32";
        }
        async executeCommand(command: string): Promise<ICommandExecutionResult> {
            let stdoutResult: string = "";
            let stderrResult: string = "";

            const process = exec(command, (error, stdout, stderr) => {
                stdoutResult = stdout;
                stderrResult = stderr;
            });

            while (process.exitCode === null) {
                await setTimeout(50);
            }

            return {
                statusCode: process.exitCode,
                stdout: stdoutResult,
                stderr: stderrResult,
            };
        }
    }
}
