import { CancellationToken } from "../infrastructure/cancellationToken.js";
import { asyncForeach } from "../infrastructure/asyncForeach.js";
import { Awaiter } from "../infrastructure/awaiter.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { ObjectType, parseObject, stringifyObject } from "../infrastructure/functions/parseObject.js";
import { ILifeTimeService, IStartableService, IStoppableService } from "../infrastructure/lifetimeServices.js";
import { Logger } from "../infrastructure/logger.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";

export namespace Model {
    export const manifestFileName: string = "manifest.yaml";
    export const metaModelDirectoryName: string = "meta-model";

    export const metaModeCategoryName: string = "meta-model";
    export const modelCategoryName: string = "model";

    export const iOptionsServiceKey = "Model.IOptions";
    export const iDelayedInvocationManagerServiceKey = "Model.IDelayedInvocationManager";
    export const iRepositoryServiceKey = "Model.IRepository";
    export const iManifestFile = "Model.IManifestFile";
    export const iMetaModel = "Model.IMetaModel";
    export const iModel = "Model.IModel";

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
                    serviceProvider.resolve(iManifestFile),
                    serviceProvider.resolve(iMetaModel),
                    serviceProvider.resolve(iModel)
                )
        );

        serviceProvider.registerSingleton(
            iManifestFile,
            () =>
                new ManifestFile(
                    serviceProvider.resolve(iOptionsServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create("Model.ManifestFile")
                )
        );

        serviceProvider.registerSingleton(
            iMetaModel,
            () =>
                new MetaModel(
                    serviceProvider.resolve(iOptionsServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create("Model.MetaModel"),
                    serviceProvider.resolve(iDelayedInvocationManagerServiceKey)
                )
        );

        serviceProvider.registerSingleton(
            iModel,
            () =>
                new Model(
                    serviceProvider.resolve(iOptionsServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create("Model.Model")
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

    interface ISynchronizable {
        synchronize(cancellationToken?: CancellationToken | undefined): Promise<void>;
    }

    export interface IRepository extends ISynchronizable, ILifeTimeService {
        manifestFile: IManifestFile;
        metaModel: IMetaModel;
        model: IModel;
    }

    export interface IManifestFile extends ISynchronizable, IStartableService {
        getManifest(): IManifest;
    }

    export interface IManifest {
        projectName: string;
    }

    export interface IMetaModel extends ISynchronizable, ILifeTimeService {
        getItems(): IMetaModelItem[];
        registerOnItemChanged(callback: (metaModelItem: IMetaModelItem) => void): void;
    }

    export interface IMetaModelItem extends IExtendable {
        getName(): string;
        getJsonSchema(): unknown;
        getMarkdownTemplate(): string;
    }

    export interface IModel extends ISynchronizable, IStartableService {
        getAllItems(): IModelItem[];
        registerOnFileChanged(callback: (modelItem: IModelItem) => void): void;
    }

    export interface IModelItem extends IExtendable {
        file: IFile;
    }

    export interface IFile {
        getFileName(): string;
        getExtension(): string;
        getRelativeFilePath(): string;
        getAbsoluteFilePath(): string;
        getDirectoryName(): string;
        getRelativeDirectoryPath(): string;
        getAbsoluteDirectoryPath(): string;

        readText(): Promise<string>;
        readJson<T>(): Promise<T>;
        readYaml<T>(): Promise<T>;
    }

    class File implements IFile {
        getFileName(): string {
            throw new Error("Method not implemented.");
        }
        getExtension(): string {
            throw new Error("Method not implemented.");
        }
        getRelativeFilePath(): string {
            throw new Error("Method not implemented.");
        }
        getAbsoluteFilePath(): string {
            throw new Error("Method not implemented.");
        }
        getDirectoryName(): string {
            throw new Error("Method not implemented.");
        }
        getRelativeDirectoryPath(): string {
            throw new Error("Method not implemented.");
        }
        getAbsoluteDirectoryPath(): string {
            throw new Error("Method not implemented.");
        }
        readText(): Promise<string> {
            throw new Error("Method not implemented.");
        }
        readJson<T>(): Promise<T> {
            throw new Error("Method not implemented.");
        }
        readYaml<T>(): Promise<T> {
            throw new Error("Method not implemented.");
        }
    }

    export interface IDelayedInvocationManager {
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

    export class Repository implements IRepository {
        constructor(public manifestFile: IManifestFile, public metaModel: IMetaModel, public model: IModel) {}

        async synchronize(cancellationToken?: CancellationToken | undefined): Promise<void> {
            await this.manifestFile.synchronize(cancellationToken);
            await this.metaModel.synchronize(cancellationToken);
            await this.model.synchronize(cancellationToken);
        }
        async start(cancellationToken?: CancellationToken | undefined): Promise<void> {
            await this.manifestFile.start(cancellationToken);
            await this.metaModel.start(cancellationToken);
            await this.model.start(cancellationToken);
        }
        async stop(): Promise<void> {
            await this.metaModel.stop();
        }
    }

    export class ManifestFile implements IManifestFile {
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

        async synchronize(cancellationToken?: CancellationToken | undefined): Promise<void> {
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
        async start(cancellationToken?: CancellationToken | undefined): Promise<void> {
            await this.synchronize(cancellationToken);
        }
    }

    export class MetaModel implements IMetaModel {
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
        ) {
            delayedInvocationManager.registerCategoryHandler(metaModeCategoryName, async (filePath) => {
                const item = await this.refreshItem(filePath);

                if (item)
                    this.onItemChangedCallbacks.forEach((callback) => {
                        callback(item);
                    });
            });
        }

        async synchronize(cancellationToken?: CancellationToken | undefined): Promise<void> {
            const directoryPath = this.getDirectoryPath();
            const filesPaths = await this.fileSystem.getFilesRecursively(directoryPath);

            this.items = [];

            await asyncForeach(
                filesPaths,
                async (filePath) => {
                    await this.refreshItem(filePath);
                },
                cancellationToken
            );
        }
        async start(cancellationToken?: CancellationToken | undefined): Promise<void> {
            if (this.watchService) {
                throw new Error("Meta model has been already started.");
            }

            const directoryPath = this.getDirectoryPath();

            if (!(await this.fileSystem.checkIfExists(directoryPath))) {
                this.fileSystem.createDirectory(directoryPath);

                this.logger.trace("Created meta model directory.");
            }

            await this.synchronize(cancellationToken);

            this.fullyFetched = true;

            this.watchService = this.fileSystem.watchRecursive(directoryPath, async (filePath) => {
                this.delayedInvocationManager.push(metaModeCategoryName, filePath);
            });
        }
        private getDirectoryPath() {
            return this.fileSystem.clearPath(this.options.getRepositoryPath(), metaModelDirectoryName);
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

        private async refreshItem(filePath: string): Promise<IMetaModelItem | null> {
            const fileName = this.fileSystem.getName(filePath);
            const name = fileName.split(".")[0];

            const itemIndex = this.items.findIndex((x) => x.name);

            if (!(await this.fileSystem.checkIfExists(filePath))) {
                this.items.splice(itemIndex, 0);

                return null;
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

            return {
                getName() {
                    return item.name;
                },
                getJsonSchema() {
                    return item.jsonSchema;
                },
                getMarkdownTemplate() {
                    return item.markdownTemplate || "";
                },
                extensions: {},
            };
        }
    }

    class Model implements IModel {
        constructor(
            private options: IOptions,
            private fileSystem: FileSystem.IFileSystem,
            private logger: Logger.ILogger
        ) {}

        async synchronize(cancellationToken?: CancellationToken | undefined): Promise<void> {}
        start(cancellationToken?: CancellationToken | undefined): Promise<void> {
            throw new Error("Method not implemented.");
        }

        getAllItems(): IModelItem[] {
            throw new Error("Method not implemented.");
        }
        registerOnFileChanged(callback: (sourceFiles: IModelItem) => void): void {
            throw new Error("Method not implemented.");
        }
    }
}
