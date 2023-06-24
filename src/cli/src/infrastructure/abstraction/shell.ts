export interface ICommandExecutionResult {
    statusCode: number;
    stdout: string;
    stderr: string;
}

export interface IProcess {
    kill(): void;
}

export interface IShell {
    runProcess(command: string): IProcess;
    executeCommand(command: string): Promise<ICommandExecutionResult>;
    isWindows(): boolean;
}