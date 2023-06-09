import { FileSystem } from "../infrastructure/file-system.js";
import { Logger } from "../infrastructure/logger.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";

export namespace Manifest {
    export const iOptionsServiceKey = "Manifest.IOptions";
    export const iRepositoryServiceKey = "Manifest.IRepository";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iOptionsServiceKey,
            () =>
                <IOptions>{
                    workingDirectory: "",
                }
        );

        serviceProvider.registerSingleton(
            iRepositoryServiceKey,
            () =>
                new Repository(
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(iOptionsServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create(iRepositoryServiceKey)
                )
        );
    }

    const fileName: string = "manifest.json";

    export interface IOptions {
        workingDirectory: string;
    }

    export class Manifest {
        private _name: string = "";

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
                name: this._name,
            };
        }
    }

    export class ManifestIsNotInitialized {}

    export class ManifestCanNotBeLoaded {}

    export interface IRepository {
        load(): Promise<Manifest | ManifestIsNotInitialized>;
        save(manifest: Manifest): Promise<void>;
        checkIfExists(): Promise<boolean>;
    }

    export class Repository implements IRepository {
        private _manifest: Manifest | null = null;

        public constructor(
            private fileSystem: FileSystem.IFileSystem,
            private options: IOptions,
            private logger: Logger.ILogger
        ) {
            this.fileSystem = fileSystem;
            this.options = options;
            this.logger = logger;
        }

        checkIfExists(): Promise<boolean> {
            return this.fileSystem.checkIfExists(this.getFilePath());
        }

        async load(): Promise<Manifest | ManifestCanNotBeLoaded | ManifestIsNotInitialized> {
            if (this._manifest !== null) {
                return this._manifest;
            }

            const filePath = this.getFilePath();

            if (await this.fileSystem.checkIfExists(filePath)) {
                let content: string;

                try {
                    content = await this.fileSystem.readFile(filePath);
                } catch (error) {
                    this.logger.error(error);

                    return new ManifestCanNotBeLoaded();
                }

                const state = JSON.parse(content);

                this._manifest = Manifest.fromState(state);

                return this._manifest;
            }

            this.logger.error("Manifest files does not exists");

            return new ManifestIsNotInitialized();
        }

        async save(manifest: Manifest): Promise<void> {
            const state = manifest.getState();
            const content = JSON.stringify(state, undefined, 2);
            const filePath = this.getFilePath();

            await this.fileSystem.createOrOverwriteFile(filePath, content);
        }

        getFilePath(): string {
            return this.fileSystem.clearPath(this.options.workingDirectory, fileName);
        }
    }
}
