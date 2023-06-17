import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { createDirectoryIfNotExists } from './file-system.js';
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

        }
    }

    save(manifest: Manifest): Promise<void> {
        throw new Error('Method not implemented.');
    }

    getAbsoluteFilePath(): string {
        return path.resolve(`${this.options.workingDirectory}/${fileName}`);
    }
}

export class ManifestFile {
    private filePath: string;

    public name: string = '';

    public constructor(directoryPath: string) {
        this.filePath = path.join(directoryPath, 'manifest.json');
    }

    async save() {
        const content = JSON.stringify({
            name: this.name
        }, undefined, 2);

        const directoryPath = path.dirname(this.filePath);

        await createDirectoryIfNotExists(directoryPath);

        await fsPromises.writeFile(this.filePath, content, {
            encoding: 'utf-8'
        });
    }

    async load() {
        if (!fs.existsSync(this.filePath)) {
            throw new Error('Manifest file is not initialized. Please use \'initialize\' command.');
        }

        const content = await fsPromises.readFile(this.filePath, {
            encoding: 'utf-8'
        });

        const object = JSON.parse(content);

        this.name = object.name;
    }

    isSaved(): boolean {
        return fs.existsSync(this.filePath);
    }
}