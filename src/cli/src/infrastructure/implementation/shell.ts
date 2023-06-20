import { exec } from "child_process";
import { setTimeout } from "timers/promises";
import { ICommandExecutionResult, IShell } from "../abstraction/shell";

export class Shell implements IShell {
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