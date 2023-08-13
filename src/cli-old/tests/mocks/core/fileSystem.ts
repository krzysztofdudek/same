import { FileSystem } from "../../../src/infrastructure/file-system.js";

export function mockFileSystem(configure?: (mock: FileSystemMock) => void): FileSystemMock {
    const mock = new FileSystemMock();

    if (configure) {
        configure(mock);
    }

    return mock;
}

class FileSystemMock implements FileSystem.IFileSystem {
    checkIfExistsImplementation: ((path: string) => boolean) | null = null;
    async checkIfExists(path: string): Promise<boolean> {
        return this.checkIfExistsImplementation !== null ? this.checkIfExistsImplementation(path) : false;
    }

    createOrOverwriteFileImplementation: ((path: string, content: string) => void) | null = null;
    async createOrOverwriteFile(path: string, content: string): Promise<void> {
        if (this.createOrOverwriteFileImplementation !== null) {
            this.createOrOverwriteFileImplementation(path, content);
        }
    }

    createFileIfNotExistsImplementation: ((path: string, content: string) => void) | null = null;
    async createFileIfNotExists(path: string, content: string): Promise<void> {
        if (this.createFileIfNotExistsImplementation !== null) {
            this.createFileIfNotExistsImplementation(path, content);
        }
    }

    readFileImplementation: ((path: string) => string) | null = null;
    async readFile(path: string): Promise<string> {
        return this.readFileImplementation !== null ? this.readFileImplementation(path) : "";
    }

    createDirectoryImplementation: ((path: string) => void) | null = null;
    async createDirectory(path: string): Promise<void> {
        if (this.createDirectoryImplementation !== null) {
            this.createDirectoryImplementation(path);
        }
    }

    deleteImplementation: ((path: string) => void) | null = null;
    async delete(path: string): Promise<void> {
        if (this.deleteImplementation !== null) {
            this.deleteImplementation(path);
        }
    }

    clearPathImplementation: ((...pathComponents: string[]) => string) | null = null;
    clearPath(...pathComponents: string[]): string {
        return this.clearPathImplementation !== null ? this.clearPathImplementation(...pathComponents) : "";
    }

    unzipImplementation: ((sourcePath: string, targetPath: string) => void) | null = null;
    async unzip(sourcePath: string, targetPath: string): Promise<void> {
        if (this.unzipImplementation !== null) {
            this.unzipImplementation(sourcePath, targetPath);
        }
    }

    getFilesRecursivelyImplementation: ((directoryPath: string) => string[]) | null = null;
    async getFilesRecursively(directoryPath: string): Promise<string[]> {
        return this.getFilesRecursivelyImplementation !== null
            ? this.getFilesRecursivelyImplementation(directoryPath)
            : [];
    }

    getExtensionImplementation: ((path: string) => string) | null = null;
    getExtension(path: string): string {
        return this.getExtensionImplementation !== null ? this.getExtensionImplementation(path) : "";
    }

    getDirectoryImplementation: ((path: string) => string) | null = null;
    getDirectory(path: string): string {
        return this.getDirectoryImplementation !== null ? this.getDirectoryImplementation(path) : "";
    }

    getNameImplementation: ((path: string) => string) | null = null;
    getName(path: string): string {
        return this.getNameImplementation !== null ? this.getNameImplementation(path) : "";
    }

    watchRecursiveImplementation: ((path: string, callback: (path: string) => void) => void) | null = null;
    watchRecursive(path: string, callback: (path: string) => void): void {
        if (this.watchRecursiveImplementation !== null) {
            this.watchRecursiveImplementation(path, callback);
        }
    }

    copyImplementation: ((sourcePath: string, destinationPath: string) => void) | null = null;
    async copy(sourcePath: string, destinationPath: string): Promise<void> {
        if (this.copyImplementation !== null) {
            this.copyImplementation(sourcePath, destinationPath);
        }
    }
}
