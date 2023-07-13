import { ServiceProvider } from "../infrastructure/service-provider.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { createHash } from "crypto";
import { Logger } from "../infrastructure/logger.js";
import { asyncForeach } from "./index.js";

export namespace Build {
    export const iOptionsServiceKey = "Build.IOptions";
    export const iContextServiceKey = "Build.IContext";
    export const iBuilderServiceKey = "Build.IBuilder";

    export const iFileDependencyIntrospectorServiceKey = "Build.IFileDependencyIntrospector";
    export const iFileAnalyzerServiceKey = "Build.IFileAnalyzer";
    export const iFileBuilderServiceKey = "Build.IFileBuilder";

    export const iBuildExtension = "Build.IBuildExtension";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iOptionsServiceKey,
            () =>
                <IOptions>{
                    outputDirectoryPath: "",
                    sourceDirectoryPath: "",
                }
        );

        serviceProvider.registerSingleton(
            iContextServiceKey,
            () =>
                new Context(
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(iOptionsServiceKey),
                    serviceProvider.resolveMany(iFileDependencyIntrospectorServiceKey),
                    serviceProvider.resolveMany(iFileAnalyzerServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create(iContextServiceKey)
                )
        );

        serviceProvider.registerSingleton(
            iBuilderServiceKey,
            () =>
                new Builder(
                    serviceProvider.resolve(iContextServiceKey),
                    serviceProvider.resolve(iOptionsServiceKey),
                    serviceProvider.resolveMany(iFileBuilderServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create(iBuilderServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolveMany<IBuildExtension>(iBuildExtension)
                )
        );
    }

    export function registerFileDependencyIntrospector(
        serviceProvider: ServiceProvider.IServiceProvider,
        factory: () => IFileDependencyIntrospector
    ) {
        serviceProvider.registerSingleton(iFileDependencyIntrospectorServiceKey, factory);
    }

    export function registerFileAnalyzer(
        serviceProvider: ServiceProvider.IServiceProvider,
        factory: () => IFileAnalyzer
    ) {
        serviceProvider.registerSingleton(iFileAnalyzerServiceKey, factory);
    }

    export function registerFileBuilder(
        serviceProvider: ServiceProvider.IServiceProvider,
        factory: () => IFileBuilder
    ) {
        serviceProvider.registerSingleton(iFileBuilderServiceKey, factory);
    }

    export function registerBuildExtension(
        serviceProvider: ServiceProvider.IServiceProvider,
        factory: () => IBuildExtension
    ) {
        serviceProvider.registerSingleton(iBuildExtension, factory);
    }

    export interface IOptions {
        sourceDirectoryPath: string;
        outputDirectoryPath: string;
        outputType: string;
    }

    export interface IContext {
        analyzeCompletely(): Promise<void>;
        analyze(filePath: string): Promise<void>;
        getAllFiles(): AnalyzedFile[];
        getFile(filePath: string): AnalyzedFile | null;
        attachOnFileAnalyzed(key: string, callback: (file: AnalyzedFile) => Promise<void>): void;
        detachOnFileAnalyzed(key: string): void;
        attachOnFileDeleted(key: string, callback: (file: string) => Promise<void>): void;
        detachOnFileDeleted(key: string): void;
    }

    export interface IBuilder {
        build(): Promise<boolean>;
    }

    export class FileBuildContext {
        public constructor(
            private _path: string,
            private _relativePath: string,
            private _extension: string,
            private _content: string
        ) {}

        public get path() {
            return this._path;
        }

        public get relativePath() {
            return this._relativePath;
        }

        public get extension() {
            return this._extension;
        }

        public get content() {
            return this._content;
        }
    }

    export interface IFileBuilder {
        fileExtensions: string[];
        outputType: string;

        build(context: FileBuildContext): Promise<void>;
    }

    export interface IBuildExtension {
        outputType: string;

        onBuildStarted(): Promise<void>;
        onFileBuilt(file: AnalyzedFile): Promise<void>;
    }

    export interface IFileDependencyIntrospector {
        fileExtensions: string[];

        getDependencies(path: string, relativePath: string, content: string): Promise<string[]>;
    }

    export enum AnalysisResultType {
        Suggestion,
        Warning,
        Error,
    }

    export class AnalysisResult {
        public constructor(
            private _type: AnalysisResultType,
            private _message: string,
            private _line?: number,
            private _column?: number
        ) {}

        public get type() {
            return this._type;
        }
        public get line() {
            return this._line || null;
        }
        public get column() {
            return this._column || null;
        }
        public get message() {
            return this._message;
        }
    }

    export interface IFileAnalyzer {
        fileExtensions: string[];

        getAnalysisResults(path: string, relativePath: string, content: string): Promise<AnalysisResult[]>;
    }

    export class AnalyzedFile {
        public constructor(
            private _path: string,
            private _compactPath: string,
            private _extension: string,
            private _dependencies: string[],
            private _hash: string,
            private _analysisResults: AnalysisResult[]
        ) {}

        public get path() {
            return this._path;
        }
        public get compactPath() {
            return this._compactPath;
        }
        public get extension() {
            return this._extension;
        }
        public get dependencies() {
            return [...this._dependencies];
        }
        public get hash() {
            return this._hash;
        }
        public get analysisResults() {
            return [...this._analysisResults];
        }
    }

    export class Context implements IContext {
        private filesPathsBeingAnalyzed: string[] = [];
        private files: AnalyzedFile[] = [];
        private onFileAnalyzed: { key: string; callback: (file: AnalyzedFile) => Promise<void> }[] = [];
        private onFileDeleted: { key: string; callback: (filePath: string) => Promise<void> }[] = [];

        public constructor(
            private fileSystem: FileSystem.IFileSystem,
            private options: IOptions,
            private dependencyFinders: IFileDependencyIntrospector[],
            private fileAnalyzers: IFileAnalyzer[],
            private logger: Logger.ILogger
        ) {}

        attachOnFileDeleted(key: string, callback: (filePath: string) => Promise<void>): void {
            this.onFileDeleted.push({ key, callback });
        }

        detachOnFileDeleted(key: string): void {
            this.onFileDeleted = this.onFileDeleted.filter((x) => x.key !== key);
        }

        detachOnFileAnalyzed(key: string): void {
            this.onFileAnalyzed = this.onFileAnalyzed.filter((x) => x.key !== key);
        }

        attachOnFileAnalyzed(key: string, callback: (file: AnalyzedFile) => Promise<void>) {
            this.onFileAnalyzed.push({ key, callback });
        }

        getAllFiles(): AnalyzedFile[] {
            return [...this.files];
        }

        getFile(filePath: string): AnalyzedFile | null {
            return this.files.find((x) => x.path === filePath) || null;
        }

        async analyzeCompletely(): Promise<void> {
            this.logger.debug("Running complete analysis");

            this.files = [];

            const filesPaths = await this.fileSystem.getFilesRecursively(this.options.sourceDirectoryPath);

            for (let i = 0; i < filesPaths.length; i++) {
                const filePath = filesPaths[i];

                await this.analyzeFileInternal(filePath);
            }

            this.logger.debug("Analysis complete");
        }

        async analyze(filePath: string): Promise<void> {
            this.logger.debug(`Running analysis`);

            await this.analyzeFileInternal(filePath);

            this.logger.debug("Analysis complete");
        }

        private async analyzeFileInternal(filePath: string): Promise<void> {
            if (this.filesPathsBeingAnalyzed.findIndex((x) => x === filePath) !== -1) {
                return;
            }

            this.filesPathsBeingAnalyzed.push(filePath);

            try {
                if (!(await this.fileSystem.checkIfExists(filePath))) {
                    this.files = this.files.filter((x) => x.path !== filePath);

                    await this.notifyWatchersOnFileDeleted(filePath);

                    return;
                }

                const fileContent = await this.fileSystem.readFile(filePath);
                const hash = createHash("sha512").update(fileContent, "utf-8").digest("base64");

                if (this.files.find((x) => x.path === filePath && x.hash === hash)) {
                    return;
                }

                const compactFilePath = this.compactPath(filePath);

                this.logger.trace(`Processing file: ${compactFilePath}`);

                const fileExtension = this.fileSystem.getExtension(filePath);
                const dependencies = await this.gatherDependencies(fileExtension, filePath, fileContent);
                const analysisResults = await this.gatherAnalysisResults(fileExtension, filePath, fileContent);

                await this.checkIfDependenciesExist(dependencies, analysisResults);

                this.printAnalysisResults(analysisResults, compactFilePath);

                const file = new AnalyzedFile(
                    filePath,
                    compactFilePath,
                    fileExtension,
                    dependencies,
                    hash,
                    analysisResults
                );

                this.updateFileInformation(file);

                await this.notifyWatchersOnFileAnalyzed(file);
            } finally {
                this.filesPathsBeingAnalyzed = this.filesPathsBeingAnalyzed.filter((x) => x !== filePath);
            }
        }

        private async notifyWatchersOnFileDeleted(filePath: string) {
            for (let i = 0; i < this.onFileDeleted.length; i++) {
                const entry = this.onFileDeleted[i];

                await entry.callback(filePath);
            }
        }

        private async notifyWatchersOnFileAnalyzed(file: AnalyzedFile) {
            for (let i = 0; i < this.onFileAnalyzed.length; i++) {
                const entry = this.onFileAnalyzed[i];

                await entry.callback(file);
            }
        }

        private async gatherAnalysisResults(fileExtension: string, path: string, content: string) {
            const analysisResults: AnalysisResult[] = [];
            const fileAnalyzers = this.fileAnalyzers.filter(
                (x) => x.fileExtensions.findIndex((y) => y === fileExtension) > -1
            );
            const relativePath = path.substring(this.options.sourceDirectoryPath.length + 1);

            for (let j = 0; j < fileAnalyzers.length; j++) {
                const fileAnalyzer = fileAnalyzers[j];
                const foundAnalysisResults = await fileAnalyzer.getAnalysisResults(path, relativePath, content);

                analysisResults.push(...foundAnalysisResults);
            }

            return analysisResults;
        }

        private async gatherDependencies(fileExtension: string, path: string, content: string): Promise<string[]> {
            const dependencyFinders = this.dependencyFinders.filter(
                (x) => x.fileExtensions.findIndex((y) => y === fileExtension) > -1
            );
            const dependencies: string[] = [];
            const relativePath = path.substring(this.options.sourceDirectoryPath.length + 1);

            for (let j = 0; j < dependencyFinders.length; j++) {
                const dependencyFinder = dependencyFinders[j];
                const foundDependencies = await dependencyFinder.getDependencies(path, relativePath, content);

                foundDependencies.forEach((dependency) => {
                    const compactDependency = this.compactPath(dependency);

                    this.logger.trace(`Found dependency: ${compactDependency}`);
                });

                dependencies.push(...foundDependencies);
            }

            return dependencies;
        }

        private printAnalysisResults(analysisResults: AnalysisResult[], compactFilePath: string) {
            analysisResults.forEach((analysisResult) => {
                const hasLocation = analysisResult.line !== null || analysisResult.column != null;
                const message = `${AnalysisResultType[analysisResult.type]} at ${compactFilePath}${
                    hasLocation ? `[${analysisResult.line ?? "-"}:${analysisResult.column ?? "-"}]` : ""
                }: ${analysisResult.message}`;

                switch (analysisResult.type) {
                    case AnalysisResultType.Error:
                        this.logger.error(message);
                        break;
                    case AnalysisResultType.Warning:
                        this.logger.warn(message);
                        break;
                    case AnalysisResultType.Suggestion:
                        this.logger.warn(message);
                }
            });
        }

        private async checkIfDependenciesExist(dependencies: string[], analysisResults: AnalysisResult[]) {
            for (let i = 0; i < dependencies.length; i++) {
                const dependency = dependencies[i];

                if (!(await this.fileSystem.checkIfExists(dependency))) {
                    analysisResults.push(
                        new AnalysisResult(
                            AnalysisResultType.Error,
                            `Dependency does not exist: ${this.compactPath(dependency)}`
                        )
                    );
                }
            }
        }

        private compactPath(path: string) {
            return path.substring(this.options.sourceDirectoryPath.length + 1);
        }

        private updateFileInformation(file: AnalyzedFile) {
            let existingEntryIndex = this.files.findIndex((x) => x.path === file.path);

            if (existingEntryIndex !== -1) {
                this.files[existingEntryIndex] = file;
            } else {
                this.files.push(file);
            }
        }
    }

    interface IBuilderFileEntry {
        file: AnalyzedFile;
        builtHash: string | null;
    }

    export class Builder implements IBuilder {
        private fileEntries: IBuilderFileEntry[] = [];
        private buildIsRunning: boolean = false;

        public constructor(
            context: IContext,
            private options: IOptions,
            private fileBuilders: IFileBuilder[],
            private logger: Logger.ILogger,
            private fileSystem: FileSystem.IFileSystem,
            private buildExtensions: IBuildExtension[]
        ) {
            context.attachOnFileAnalyzed("builder", async (file) => {
                let existingEntryIndex = this.fileEntries.findIndex((x) => x.file.path === file.path);

                if (existingEntryIndex !== -1) {
                    const currentFileEntry = this.fileEntries[existingEntryIndex];
                    currentFileEntry.file = file;

                    if (file.hash !== currentFileEntry.builtHash) {
                        this.resetBuildHashForDependentFiles(currentFileEntry);
                    }
                } else {
                    const fileEntry = { file, builtHash: null };

                    this.fileEntries.push(fileEntry);
                }
            });

            context.attachOnFileDeleted("builder", async (filePath) => {
                this.fileEntries = this.fileEntries.filter((x) => x.file.path !== filePath);
            });
        }

        async build(): Promise<boolean> {
            if (this.buildIsRunning) {
                return true;
            }

            this.buildIsRunning = true;

            try {
                this.logger.debug("Running build");

                const wereDetectedErrors = this.fileEntries.find(
                    (x) => x.file.analysisResults.find((y) => y.type === AnalysisResultType.Error) !== undefined
                );

                if (wereDetectedErrors) {
                    this.logger.info("Build failed");

                    return false;
                }

                const buildExtensions = this.buildExtensions.filter((x) => x.outputType === this.options.outputType);

                await asyncForeach(buildExtensions, async (x) => await x.onBuildStarted());

                await this.fileSystem.createDirectory(this.options.outputDirectoryPath);

                const fileEntries = this.fileEntries.filter((x) => x.builtHash !== x.file.hash);
                for (let i = 0; i < fileEntries.length; i++) {
                    const fileEntry = fileEntries[i];

                    const result = await this.buildFile(fileEntry, this.options.outputType);

                    if (!result) {
                        return false;
                    }

                    await asyncForeach(buildExtensions, async (x) => await x.onFileBuilt(fileEntry.file));
                }

                this.logger.debug("Build succeeded");

                return true;
            } finally {
                this.buildIsRunning = false;
            }
        }

        private async buildFile(
            fileEntry: IBuilderFileEntry,
            outputType: string,
            dependencyStack?: { parent: string; child: string }[]
        ): Promise<boolean> {
            if (!(await this.fileSystem.checkIfExists(fileEntry.file.path))) {
                this.fileEntries = this.fileEntries.filter((x) => x.file.path !== fileEntry.file.path);
            }

            if (fileEntry.builtHash == fileEntry.file.hash) {
                return true;
            }

            const hash = fileEntry.file.hash;

            dependencyStack ??= [];
            const localDependencies: { parent: string; child: string }[] = [];

            for (let i = 0; i < fileEntry.file.dependencies.length; i++) {
                const dependency = fileEntry.file.dependencies[i];
                const dependencyFileEntry = this.fileEntries.find((x) => x.file.path === dependency);

                if (!dependencyFileEntry) {
                    continue;
                }

                if (
                    dependencyStack.findIndex((x) => x.parent === fileEntry.file.path && x.child === dependency) !== -1
                ) {
                    this.logger.error(`Detected dependency loop for "${fileEntry.file.compactPath}". Build stopped.`);

                    return false;
                }

                const newEntry = { parent: fileEntry.file.path, child: dependency };

                if (
                    localDependencies.findIndex((x) => x.parent === newEntry.parent && x.child == newEntry.child) !== -1
                ) {
                    continue;
                }

                dependencyStack.push(newEntry);
                localDependencies.push(newEntry);

                const result = await this.buildFile(dependencyFileEntry, outputType, dependencyStack);

                if (!result) return false;
            }

            try {
                const fileBuilders = this.fileBuilders.filter(
                    (x) =>
                        x.fileExtensions.findIndex((y) => y === fileEntry.file.extension) > -1 &&
                        x.outputType === outputType
                );
                const relativePath = fileEntry.file.path.substring(this.options.sourceDirectoryPath.length + 1);

                for (let j = 0; j < fileBuilders.length; j++) {
                    const fileBuilder = fileBuilders[j];

                    this.logger.info(`Building: ${fileEntry.file.compactPath}`);

                    const fileContent = await this.fileSystem.readFile(fileEntry.file.path);

                    await fileBuilder.build(
                        new FileBuildContext(fileEntry.file.path, relativePath, fileEntry.file.extension, fileContent)
                    );
                }

                fileEntry.builtHash = hash;

                return true;
            } catch (error) {
                this.logger.info("Build failed");
                this.logger.error(error);

                return false;
            }
        }

        private resetBuildHashForDependentFiles(fileEntry: IBuilderFileEntry) {
            const dependentFilesEntries = this.fileEntries.filter(
                (x) => x.file.dependencies.indexOf(fileEntry.file.path) !== -1
            );

            dependentFilesEntries.forEach((fileEntry) => {
                fileEntry.builtHash = null;

                this.resetBuildHashForDependentFiles(fileEntry);
            });
        }
    }
}
