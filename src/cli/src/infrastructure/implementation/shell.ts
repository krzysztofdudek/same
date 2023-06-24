import { ChildProcess, exec } from "child_process";
import { setTimeout } from "timers/promises";
import { ICommandExecutionResult, IProcess, IShell } from "../abstraction/shell";

export class Process implements IProcess {
    public constructor(
        private process: ChildProcess
    ) {}

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
        return process.platform === 'win32';
    }
    async executeCommand(command: string): Promise<ICommandExecutionResult> {
        let stdoutResult: string = '';
        let stderrResult: string = '';

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
            stderr: stderrResult
        }
    }
}