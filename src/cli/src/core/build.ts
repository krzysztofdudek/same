import { ServiceProvider } from "../infrastructure/service-provider.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { createHash } from "crypto";
import { Logger } from "../infrastructure/logger.js";
import { relative } from "path";

export namespace Build {
    export const iOptionsServiceKey = "Build.IOptions";
    export const iContextServiceKey = "Build.IContext";
    export const iBuilderServiceKey = "Build.IBuilder";

    export const iFileDependencyIntrospectorServiceKey = "Build.IFileDependencyIntrospector";
    export const iFileAnalyzerServiceKey = "Build.IFileAnalyzer";
    export const iFileBuilderServiceKey = "Build.IFileBuilder";

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
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey)
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

    export interface IOptions {
        sourceDirectoryPath: string;
        outputDirectoryPath: string;
    }

    export interface IContext {
        runCompleteAnalysis(): Promise<void>;
        runAnalysis(filePath: string): Promise<FileToBuild | undefined>;
        getAllFiles(): FileToBuild[];
        getFile(filePath: string): FileToBuild | undefined;
    }

    export interface IBuilder {
        buildAll(outputType: string): Promise<boolean>;
        build(filePath: string, outputType: string): Promise<boolean>;
    }

    export class FileBuildContext {
        public constructor(private _path: string, private _relativePath: string, private _content: string) {}

        public get path() {
            return this._path;
        }
        public get relativePath() {
            return this._relativePath;
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

    class FileToBuild {
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
        private performedCompleteAnalysis = false;
        private files: FileToBuild[] = [];

        public constructor(
            private fileSystem: FileSystem.IFileSystem,
            private options: IOptions,
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

            const filesPaths = await this.fileSystem.getFilesRecursively(this.options.sourceDirectoryPath);

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
            const compactFilePath = this.compactPath(filePath);

            this.logger.trace(`Processing file: ${compactFilePath}`);

            const fileExtension = this.fileSystem.getExtension(filePath);
            const fileContent = await this.fileSystem.readFile(filePath);

            const dependencies = await this.analyzeDependencies(fileExtension, filePath, fileContent);
            const analysisResults = await this.analyzeFile(fileExtension, filePath, fileContent);

            await this.checkIfDependenciesExist(dependencies, analysisResults);

            this.printAnalysisResults(analysisResults, compactFilePath);

            const hash = createHash("sha512").update(fileContent, "utf-8").digest("base64");

            this.updateFileInformation(
                new FileToBuild(filePath, compactFilePath, fileExtension, dependencies, hash, analysisResults)
            );
        }

        private async analyzeFile(fileExtension: string, path: string, content: string) {
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

        private async analyzeDependencies(fileExtension: string, path: string, content: string): Promise<string[]> {
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
            private context: IContext,
            private options: IOptions,
            private fileBuilders: IFileBuilder[],
            private logger: Logger.ILogger,
            private fileSystem: FileSystem.IFileSystem
        ) {}

        async buildAll(outputType: string): Promise<boolean> {
            this.logger.info("Running complete build");

            await this.context.runCompleteAnalysis();

            const files = this.context.getAllFiles();

            const wereDetectedErrors = files.find(
                (x) => x.analysisResults.find((y) => y.type === AnalysisResultType.Error) !== undefined
            );

            if (wereDetectedErrors) {
                this.logger.info("Build failed");

                return false;
            }

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                try {
                    await this.buildInternal(file, outputType);
                } catch (error) {
                    this.logger.info("Build failed");
                    this.logger.error(error);

                    return false;
                }
            }

            this.logger.info("Build succeeded");

            return true;
        }

        async build(filePath: string, outputType: string): Promise<boolean> {
            const file = await this.context.runAnalysis(filePath);

            return true;
        }

        async buildInternal(file: FileToBuild, outputType: string): Promise<void> {
            const fileBuilders = this.fileBuilders.filter(
                (x) => x.fileExtensions.findIndex((y) => y === file.extension) > -1 && x.outputType === outputType
            );
            const relativePath = file.path.substring(this.options.sourceDirectoryPath.length + 1);

            for (let j = 0; j < fileBuilders.length; j++) {
                const fileBuilder = fileBuilders[j];

                this.logger.info(`Building: ${file.compactPath}`);

                const fileContent = await this.fileSystem.readFile(file.path);

                await fileBuilder.build(new FileBuildContext(file.path, relativePath, fileContent));
            }
        }

        private buildInvertedDependencies() {
            const files = this.context.getAllFiles();
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
