import path from 'path';
import { IFileSystem } from '../infrastructure/abstraction/file-system.js';

const fileName: string = 'manifest.json';

export interface Options {
    workingDirectory: string;
}

export class Manifest {
    public name: string = '';
}

export interface IManifestRepository {
    load(): Promise<Manifest>;
    save(manifest: Manifest): Promise<void>;
}

export class ManifestRepository implements IManifestRepository {
    private fileSystem: IFileSystem;
    private options: Options;

    public constructor(fileSystem: IFileSystem, options: Options) {
        this.fileSystem = fileSystem;
        this.options = options;
    }

    async load(): Promise<Manifest> {
        const filePath = this.getAbsoluteFilePath();

        if (await this.fileSystem.checkIfExists(filePath)) {
            const content = await this.fileSystem.readFile(filePath);

            return (<Manifest> JSON.parse(content));
        }

        throw new Error('Manifest file is not initialized. Please use \"samecli initialize\" command.');
    }

    async save(manifest: Manifest): Promise<void> {
        const content = JSON.stringify(manifest, undefined, 2);
        const filePath = this.getAbsoluteFilePath();

        await this.fileSystem.createOrOverwriteFile(filePath, content);
    }

    getAbsoluteFilePath(): string {
        return path.resolve(`${this.options.workingDirectory}/${fileName}`);
    }
}