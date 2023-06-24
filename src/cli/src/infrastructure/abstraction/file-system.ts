export interface IFileSystem {
    checkIfExists(path: string): Promise<boolean>;
    createOrOverwriteFile(path: string, content: string): Promise<void>;
    createFileIfNotExists(path: string, content: string): Promise<void>;
    readFile(path: string): Promise<string>;
    createDirectory(path: string): Promise<void>;
    delete(path: string): Promise<void>;
    clearPath(...pathComponents: string[]): string;
}

