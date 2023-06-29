import { ServiceProvider } from "../infrastructure/service-provider.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { createHash } from "crypto";
import { Logger } from "../infrastructure/logger.js";

export namespace Build {
    export const iBuildOptionsServiceKey = "Build.IBuildOptions";
    export const iBuildContextServiceProvider = "Build.IBuildContext";

    export const iFileDependencyIntrospectorServiceKey = "Build.IFileDependencyIntrospector";
    export const iFileAnalyzerServiceKey = "Build.IFileAnalyzer";
    export const iFileBuilderServiceKey = "Build.IFileBuilder";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iBuildOptionsServiceKey,
            () =>
                <IBuildOptions>{
                    outputDirectoryPath: "",
                    sourceDirectoryPath: "",
                }
        );

        serviceProvider.registerSingleton(
            iBuildContextServiceProvider,
            () =>
                new BuildContext(
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(iBuildOptionsServiceKey),
                    serviceProvider.resolveMany(iFileDependencyIntrospectorServiceKey),
                    serviceProvider.resolveMany(iFileAnalyzerServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create(iBuildContextServiceProvider)
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

    export interface IBuildOptions {
        sourceDirectoryPath: string;
        outputDirectoryPath: string;
    }

    export interface IBuildContext {
        runCompleteAnalysis(): Promise<void>;
        runAnalysis(filePath: string): Promise<FileToBuild | undefined>;
        getAllFiles(): FileToBuild[];
        getFile(filePath: string): FileToBuild | undefined;
    }

    export interface IBuilder {
        buildAll(): Promise<void>;
        build(filePath: string): Promise<void>;
    }

    export interface IFileBuilder {
        fileExtension: string;

        build(filePath: string): Promise<void>;
    }

    export interface IFileDependencyIntrospector {
        fileExtension: string;

        getDependencies(filePath: string, fileContent: string): Promise<string[]>;
    }

    export enum AnalysisResultType {
        Information,
        Warning,
        Error,
    }

    export class AnalysisResult {
        public constructor(type: AnalysisResultType, line: number, column: number, message: string) {}
    }

    export interface IFileAnalyzer {
        fileExtension: string;

        getAnalysisResults(fileContent: string): Promise<AnalysisResult[]>;
    }

    class FileToBuild {
        public constructor(
            private _path: string,
            private _extension: string,
            private _dependencies: string[],
            private _hash: string,
            private _analysisResults: AnalysisResult[]
        ) {}

        public get path() {
            return this._path;
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

    export class BuildContext implements IBuildContext {
        private performedCompleteAnalysis = false;
        private files: FileToBuild[] = [];

        public constructor(
            private fileSystem: FileSystem.IFileSystem,
            private compilerOptions: IBuildOptions,
            private dependencyFinders: IFileDependencyIntrospector[],
            private fileAnalyzers: IFileAnalyzer[],
            private logger: Logger.ILogger
        ) {}

        getAllFiles(): FileToBuild[] {
            return this.files;
        }
        getFile(filePath: string): FileToBuild | undefined {
            return this.files.find((x) => x.path === filePath);
        }
        async runCompleteAnalysis(): Promise<void> {
            this.logger.debug("Running complete analysis");

            this.files = [];

            const filesPaths = await this.fileSystem.getFilesRecursively(this.compilerOptions.sourceDirectoryPath);

            for (let i = 0; i < filesPaths.length; i++) {
                const filePath = filesPaths[i];

                await this.processFile(filePath);
            }

            this.performedCompleteAnalysis = true;

            this.logger.debug("Analysis complete");
        }
        async runAnalysis(filePath: string): Promise<FileToBuild | undefined> {
            if (this.performedCompleteAnalysis === false) {
                await this.runCompleteAnalysis();

                return;
            }

            this.logger.debug(`Running analysis of single file: ${filePath}`);

            await this.processFile(filePath);

            this.logger.debug("Analysis complete");
        }
        private async processFile(filePath: string): Promise<void> {
            this.logger.trace(`Processing file: ${filePath}`);

            const fileExtension = this.fileSystem.getExtension(filePath);
            const fileContent = await this.fileSystem.readFile(filePath);

            const dependencyFinders = this.dependencyFinders.filter((x) => x.fileExtension === fileExtension);
            const dependencies: string[] = [];
            for (let j = 0; j < dependencyFinders.length; j++) {
                const dependencyFinder = dependencyFinders[j];
                const foundDependencies = await dependencyFinder.getDependencies(filePath, fileContent);

                foundDependencies.forEach((dependency) => this.logger.trace(`Found dependency: ${dependency}`));

                dependencies.push(...foundDependencies);
            }

            const fileAnalyzers = this.fileAnalyzers.filter((x) => x.fileExtension === fileExtension);
            const analysisResults: AnalysisResult[] = [];
            for (let j = 0; j < fileAnalyzers.length; j++) {
                const fileAnalyzer = fileAnalyzers[j];
                const foundAnalysisResults = await fileAnalyzer.getAnalysisResults(fileContent);

                foundAnalysisResults.forEach((analysisResult) =>
                    this.logger.trace(`Found analysis result`, analysisResult)
                );

                analysisResults.push(...foundAnalysisResults);
            }

            const hash = createHash("sha512").update(fileContent, "utf-8").digest("base64");

            this.updateFileInformation(new FileToBuild(filePath, fileExtension, dependencies, hash, analysisResults));
        }
        private updateFileInformation(file: FileToBuild) {
            let existingEntryIndex = this.files.findIndex((x) => x.path === file.path);

            if (existingEntryIndex !== -1) {
                this.files[existingEntryIndex] = file;
            } else {
                this.files.push(file);
            }
        }
    }

    export class Builder implements IBuilder {
        private runCompleteBuild = false;

        private compiledFiles: {
            path: string;
            hash: string;
        }[] = [];

        private invertedDependencies: {
            filePath: string;
            dependentFilesPaths: string[];
        }[] = [];

        public constructor(
            private buildContext: IBuildContext,
            private buildOptions: IBuildOptions,
            private fileBuilders: IFileBuilder[],
            private logger: Logger.ILogger
        ) {}

        async buildAll(): Promise<void> {
            this.logger.info("Building all files");

            await this.buildContext.runCompleteAnalysis();

            const files = this.buildContext.getAllFiles();

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                await this.buildInternal(file);
            }

            this.logger.info("Building all files succeeded");
        }

        async build(filePath: string): Promise<void> {
            const file = await this.buildContext.runAnalysis(filePath);
        }

        async buildInternal(file: FileToBuild): Promise<void> {
            const fileBuilders = this.fileBuilders.filter((x) => x.fileExtension === file.extension);

            for (let j = 0; j < fileBuilders.length; j++) {
                const fileBuilder = fileBuilders[j];

                await fileBuilder.build(file.path);
            }
        }

        private buildInvertedDependencies() {
            const files = this.buildContext.getAllFiles();
            this.invertedDependencies = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const filePath = file.path;
                const dependenciesFilePaths = file.dependencies;

                for (let j = 0; dependenciesFilePaths.length; j++) {
                    const dependencyFilePath = dependenciesFilePaths[j];

                    const invertedDependency = this.invertedDependencies.find((x) => x.filePath === dependencyFilePath);

                    if (invertedDependency === undefined) {
                        this.invertedDependencies.push({
                            filePath: dependencyFilePath,
                            dependentFilesPaths: [filePath],
                        });
                    } else {
                        invertedDependency.dependentFilesPaths.push(filePath);
                    }
                }
            }
        }
    }
}
