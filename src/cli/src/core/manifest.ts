import path from 'path';
import { IFileSystem } from '../infrastructure/abstraction/file-system.js';
import { ILogger } from '../infrastructure/abstraction/logger.js';

const fileName: string = 'manifest.json';

export interface Options {
    workingDirectory: string;
}

export class Manifest {
    private _name: string = '';

    private constructor(state?: any) {
        if (!state) {
            return;
        }

        this.name = state.name;
    }

    public static empty(): Manifest {
        return new Manifest();
    }

    public static fromState(state: any): Manifest {
        return new Manifest(state);
    }

    public get name() {
        return this._name;
    }

    public set name(name: string) {
        this._name = name;
    }

    public getState(): any {
        return {
            name: this._name
        }
    }
}

export class ManifestIsNotInitialized {}

export class ManifestCanNotBeLoaded {}

export interface IManifestRepository {
    load(): Promise<Manifest | ManifestIsNotInitialized>;
    save(manifest: Manifest): Promise<void>;
    checkIfExists(): Promise<boolean>;
}

export class ManifestRepository implements IManifestRepository {
    private fileSystem: IFileSystem;
    private options: Options;
    private logger: ILogger;

    public constructor(fileSystem: IFileSystem, options: Options, logger: ILogger) {
        this.fileSystem = fileSystem;
        this.options = options;
        this.logger = logger;
    }

    checkIfExists(): Promise<boolean> {
        return this.fileSystem.checkIfExists(this.getAbsoluteFilePath());
    }

    async load(): Promise<Manifest | ManifestCanNotBeLoaded | ManifestIsNotInitialized> {
        const filePath = this.getAbsoluteFilePath();

        if (await this.fileSystem.checkIfExists(filePath)) {
            let content: string;

            try {
                content = await this.fileSystem.readFile(filePath);
            } catch (error) {
                this.logger.error(error);

                return new ManifestCanNotBeLoaded();
            }

            const state = JSON.parse(content);

            return Manifest.fromState(state);
        }

        this.logger.error('Manifest files does not exists.');

        return new ManifestIsNotInitialized();
    }

    async save(manifest: Manifest): Promise<void> {
        const state = manifest.getState();
        const content = JSON.stringify(state, undefined, 2);
        const filePath = this.getAbsoluteFilePath();

        await this.fileSystem.createOrOverwriteFile(filePath, content);
    }

    getAbsoluteFilePath(): string {
        return path.resolve(`${this.options.workingDirectory}/${fileName}`);
    }
}