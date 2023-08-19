import { CancellationToken } from "../infrastructure/cancellationToken.js";
import { asyncForeach } from "../infrastructure/asyncForeach.js";
import { Awaiter } from "../infrastructure/awaiter";
import { FileSystem } from "../infrastructure/file-system.js";
import { ObjectType, parseObject, stringifyObject } from "../infrastructure/functions/parseObject.js";
import { ILifeTimeService, IStartableService, IStoppableService } from "../infrastructure/lifetimeServices.js";
import { Logger } from "../infrastructure/logger";
import { ServiceProvider } from "../infrastructure/service-provider.js";

export namespace Model {
    const manifestFileName: string = "manifest.yaml";
    const metaModelDirectoryName: string = "meta-model";

    const metaModelName: string = "meta-model";
    const modelName: string = "model";

    export const iOptionsServiceKey = "Model.IOptions";
    export const iDelayedInvocationManagerServiceKey = "Model.IDelayedInvocationManager";
    export const iRepositoryServiceKey = "Model.IRepository";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iOptionsServiceKey,
            () =>
                <IOptions>{
                    repositoryPath: null,
                    getRepositoryPath() {
                        if (this.repositoryPath === null) {
                            throw new Error("Repository path is not set.");
                        }
                    },
                }
        );

        serviceProvider.registerSingleton(
            iDelayedInvocationManagerServiceKey,
            () =>
                new DelayedInvocationManager(
                    serviceProvider.resolve(Awaiter.iAwaiterServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create("Model.DelayedInvocationManager")
                )
        );

        serviceProvider.registerSingleton(
            iRepositoryServiceKey,
            () =>
                new Repository(
                    serviceProvider.resolve(iOptionsServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey),
                    serviceProvider.resolve(iDelayedInvocationManagerServiceKey)
                )
        );
    }

    export interface IOptions {
        repositoryPath: string | null;

        getRepositoryPath(): string;
    }

    interface IExtendable {
        extensions: { [key: string]: unknown };
    }

    interface IRepository extends ILifeTimeService {
        manifestFile: IManifestFile;
        metaModel: IMetaModel;
        vsCode: IVsCode;
        source: ISource;
    }

    interface IManifestFile extends IStartableService {
        getManifest(): IManifest;
    }

    interface IManifest {
        projectName: string;
    }

    interface IMetaModel extends ILifeTimeService {
        getItems(): IMetaModelItem[];
        registerOnItemChanged(callback: (metaModelItem: IMetaModelItem) => void): void;
    }

    interface IMetaModelItem extends IExtendable {
        getName(): string;
        getJsonSchema(): unknown;
        getMarkdownTemplate(): string;
    }

    interface IVsCode extends IStartableService {
        extensions: unknown;
        settings: unknown;
        tasks: unknown;
    }

    interface ISource extends IStartableService {
        getAllFiles(): ISourceFile[];
        registerOnFileChanged(callback: (sourceFiles: ISourceFile) => void): void;
    }

    interface ISourceFile extends IExtendable {
        file: IFile;
    }

    interface IFile {
        fileName: string;
        filePath: string;
        directoryName: string;
        directoryPath: string;
        extension: string;

        readText(): Promise<string>;
        readJson<T>(): Promise<T>;
        readYaml<T>(): Promise<T>;
    }

    interface IDelayedInvocationManager {
        registerCategoryHandler(
            category: string,
            handler: (name: string, cancellationToken?: CancellationToken | undefined) => Promise<void>
        ): void;
        push(category: string, name: string): void;
    }

    class DelayedInvocationManager implements IDelayedInvocationManager, ILifeTimeService {
        private entries: { category: string; name: string }[] = [];
        private categoryHandlers: {
            category: string;
            handler: (name: string, cancellationToken?: CancellationToken | undefined) => Promise<void>;
        }[] = [];
        private processingLoopPromise: Promise<void> | undefined;
        private cancellationToken: CancellationToken = new CancellationToken();

        constructor(private awaiter: Awaiter.IAwaiter, private logger: Logger.ILogger) {}

        async start(): Promise<void> {
            this.processingLoopPromise = new Promise(async () => {
                while (true) {
                    if (this.cancellationToken?.isCancelled) {
                        break;
                    }

                    if (this.entries.length === 0) {
                        continue;
                    }

                    let entries = [...this.entries];

                    for (let i = 0; i < entries.length; i++) {
                        const entry = entries[i];

                        await asyncForeach(
                            this.categoryHandlers.filter(
                                (categoryHandler) => categoryHandler.category === entry.category
                            ),
                            async (categoryHandler) => {
                                try {
                                    await categoryHandler.handler(entry.name, this.cancellationToken);
                                } catch (error) {
                                    this.logger.error(`Uncaught exception: ${error}`);
                                }
                            }
                        );

                        entries = entries.filter((x) => entries.indexOf(x) === -1);
                    }

                    await this.awaiter.wait(500);
                }
            });
        }
        async stop(): Promise<void> {
            this.cancellationToken?.cancel();

            await this.processingLoopPromise;
        }

        registerCategoryHandler(
            category: string,
            handler: (name: string, cancellationToken?: CancellationToken | undefined) => Promise<void>
        ): void {
            this.categoryHandlers.push({
                category: category,
                handler: handler,
            });
        }
        push(category: string, name: string): void {
            this.entries.push({ category, name });
        }
    }

    class Repository implements IRepository {
        manifestFile: IManifestFile;
        metaModel: IMetaModel;
        vsCode: IVsCode;
        source: ISource;

        constructor(
            options: IOptions,
            fileSystem: FileSystem.IFileSystem,
            loggerFactory: Logger.ILoggerFactory,
            delayedInvocationManager: IDelayedInvocationManager
        ) {
            this.manifestFile = new ManifestFile(options, fileSystem, loggerFactory.create("Model.ManifestFile"));
            this.metaModel = new MetaModel(
                options,
                fileSystem,
                loggerFactory.create("Model.MetaModel"),
                delayedInvocationManager
            );
            this.vsCode = new VsCode(options, fileSystem);
            this.source = new Source(options, fileSystem);
        }

        async start(cancellationToken?: CancellationToken | undefined): Promise<void> {
            await this.manifestFile.start(cancellationToken);
            await this.metaModel.start(cancellationToken);
            await this.vsCode.start(cancellationToken);
            await this.source.start(cancellationToken);
        }
        async stop(): Promise<void> {
            await this.metaModel.stop();
        }
    }

    class ManifestFile implements IManifestFile {
        private manifest: IManifest | null = null;

        constructor(
            private options: IOptions,
            private fileSystem: FileSystem.IFileSystem,
            private logger: Logger.ILogger
        ) {}

        getManifest(): IManifest {
            if (this.manifest === null) {
                throw new Error("Manifest can not be accessed. Manifest file have not been synchronized.");
            }

            return this.manifest;
        }

        async start(): Promise<void> {
            const filePath = this.fileSystem.clearPath(this.options.getRepositoryPath(), manifestFileName);

            if (this.manifest === null) {
                if (await this.fileSystem.checkIfExists(filePath)) {
                    const fileContent = await this.fileSystem.readFile(filePath);

                    this.manifest = parseObject(fileContent, ObjectType.Yaml);

                    this.logger.trace("Manifest file fetched.");
                } else {
                    this.manifest = {
                        projectName: "Hello World",
                    };

                    const fileContent = stringifyObject(this.manifest, ObjectType.Yaml);

                    await this.fileSystem.createOrOverwriteFile(filePath, fileContent);

                    this.logger.trace("New manifest file created.");
                }
            } else {
                const fileContent = stringifyObject(this.manifest, ObjectType.Yaml);

                await this.fileSystem.createOrOverwriteFile(filePath, fileContent);

                this.logger.trace("Manifest file synchronized.");
            }
        }
    }

    class MetaModel implements IMetaModel {
        private onItemChangedCallbacks: ((metaModelItem: IMetaModelItem) => void)[] = [];
        private items: {
            name: string;
            jsonSchema: unknown;
            markdownTemplate: string | null;
            extensions: { [key: string]: unknown };
        }[] = [];
        private watchService: IStoppableService | null = null;
        private fullyFetched: boolean = false;

        constructor(
            private options: IOptions,
            private fileSystem: FileSystem.IFileSystem,
            private logger: Logger.ILogger,
            private delayedInvocationManager: IDelayedInvocationManager
        ) {}

        async start(cancellationToken?: CancellationToken | undefined): Promise<void> {
            const directoryPath = this.fileSystem.clearPath(this.options.getRepositoryPath(), metaModelDirectoryName);

            if (!(await this.fileSystem.checkIfExists(directoryPath))) {
                this.fileSystem.createDirectory(directoryPath);

                this.logger.trace("Created meta model directory.");
            }

            const filesPaths = await this.fileSystem.getFilesRecursively(directoryPath);

            this.items = [];

            await asyncForeach(filesPaths, async (filePath) => {
                await this.refreshItem(filePath);

                cancellationToken?.throwIfCancelled();
            });

            this.fullyFetched = true;

            this.watchService = this.fileSystem.watchRecursive(directoryPath, async (filePath) => {
                this.delayedInvocationManager.push(metaModelName, filePath);
            });
        }

        async stop(): Promise<void> {
            await this.watchService?.stop();
        }

        getItems(): IMetaModelItem[] {
            if (!this.fullyFetched) {
                throw new Error("Meta model items can not be accessed. Meta model have not been fully fetched.");
            }

            return this.items.map(
                (x) =>
                    <IMetaModelItem>{
                        getName() {
                            return x.name;
                        },
                        getJsonSchema() {
                            return x.jsonSchema;
                        },
                        getMarkdownTemplate() {
                            return x.markdownTemplate;
                        },
                    }
            );
        }
        registerOnItemChanged(callback: (metaModelItem: IMetaModelItem) => void): void {
            this.onItemChangedCallbacks.push(callback);
        }

        private async refreshItem(filePath: string) {
            const fileName = this.fileSystem.getName(filePath);
            const name = fileName.split(".")[0];

            const itemIndex = this.items.findIndex((x) => x.name);

            if (!(await this.fileSystem.checkIfExists(filePath))) {
                this.items.splice(itemIndex, 0);

                return;
            }

            let item = this.items[itemIndex];

            const type = fileName.substring(name.length + 1);
            const jsonSchema =
                type === "json" ? parseObject(await this.fileSystem.readFile(filePath), ObjectType.Json) : null;
            const markdownTemplate = type === "template.md" ? await this.fileSystem.readFile(filePath) : null;

            if (item === undefined) {
                item = {
                    name,
                    jsonSchema,
                    markdownTemplate,
                    extensions: {},
                };

                this.items.push(item);
            } else {
                item.jsonSchema = jsonSchema ?? item.jsonSchema;
                item.markdownTemplate = markdownTemplate ?? item.markdownTemplate;
            }
        }
    }

    class VsCode implements IVsCode {
        constructor(private options: IOptions, private fileSystem: FileSystem.IFileSystem) {}

        extensions: unknown;
        settings: unknown;
        tasks: unknown;

        start(cancellationToken?: CancellationToken | undefined): Promise<void> {
            throw new Error("Method not implemented.");
        }
    }

    class Source implements ISource {
        constructor(private options: IOptions, private fileSystem: FileSystem.IFileSystem) {}

        start(cancellationToken?: CancellationToken | undefined): Promise<void> {
            throw new Error("Method not implemented.");
        }

        getAllFiles(): ISourceFile[] {
            throw new Error("Method not implemented.");
        }
        registerOnFileChanged(callback: (sourceFiles: ISourceFile) => void): void {
            throw new Error("Method not implemented.");
        }
    }
}
