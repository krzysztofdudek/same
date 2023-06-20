export interface ICommandExecutionResult {
    statusCode: number;
    stdout: string;
    stderr: string;
}

export interface IShell {
    executeCommand(command: string): Promise<ICommandExecutionResult>;
    isWindows(): boolean;
}