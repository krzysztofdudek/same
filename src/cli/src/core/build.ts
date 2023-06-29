import { ServiceProvider } from "../infrastructure/service-provider.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { createHash } from "crypto";

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
                    serviceProvider.resolveMany(iFileAnalyzerServiceKey)
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

    export function registerFileCompiler(
        serviceProvider: ServiceProvider.IServiceProvider,
        factory: () => IFileCompiler
    ) {
        serviceProvider.registerSingleton(iFileBuilderServiceKey, factory);
    }

    export interface IBuildOptions {
        sourceDirectoryPath: string;
        outputDirectoryPath: string;
    }

    export interface IBuildContext {
        analyzeAllFiles(): Promise<void>;
        analyzeFile(filePath: string): Promise<void>;
        getAllFiles(): IBuildContextFile[];
        getFile(filePath: string): IBuildContextFile | undefined;
    }

    export interface IBuilder {
        buildAll(): Promise<void>;
        build(filePath: string): Promise<void>;
    }

    export interface IFileCompiler {
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

    export interface IAnalysisResult {
        type: AnalysisResultType;
        line: number;
        column: number;
        message: string;
    }

    export interface IFileAnalyzer {
        fileExtension: string;

        getAnalysisResults(fileContent: string): Promise<IAnalysisResult[]>;
    }

    interface IBuildContextFile {
        path: string;
        extension: string;
        dependencies: string[];
        hash: string;
        analysisResults: IAnalysisResult[];
    }

    export class BuildContext implements IBuildContext {
        private files: IBuildContextFile[] = [];

        public constructor(
            private fileSystem: FileSystem.IFileSystem,
            private compilerOptions: IBuildOptions,
            private dependencyFinders: IFileDependencyIntrospector[],
            private fileAnalyzers: IFileAnalyzer[]
        ) {}

        getAllFiles(): IBuildContextFile[] {
            return this.files;
        }
        getFile(filePath: string): IBuildContextFile | undefined {
            return this.files.find((x) => x.path === filePath);
        }
        async analyzeAllFiles(): Promise<void> {
            this.files = [];

            const filesPaths = await this.fileSystem.getFilesRecursively(this.compilerOptions.sourceDirectoryPath);

            for (let i = 0; i < filesPaths.length; i++) {
                const filePath = filesPaths[i];

                await this.processFile(filePath);
            }
        }
        async analyzeFile(filePath: string): Promise<void> {
            await this.processFile(filePath);
        }
        private async processFile(filePath: string): Promise<void> {
            const fileExtension = this.fileSystem.getExtension(filePath);
            const fileContent = await this.fileSystem.readFile(filePath);

            const dependencyFinders = this.dependencyFinders.filter((x) => x.fileExtension === fileExtension);
            const dependencies: string[] = [];
            for (let j = 0; j < dependencyFinders.length; j++) {
                const dependencyFinder = dependencyFinders[j];

                dependencies.push(...(await dependencyFinder.getDependencies(filePath, fileContent)));
            }

            const fileAnalyzers = this.fileAnalyzers.filter((x) => x.fileExtension === fileExtension);
            const analysisResults: IAnalysisResult[] = [];
            for (let j = 0; j < fileAnalyzers.length; j++) {
                const fileAnalyzer = fileAnalyzers[j];

                analysisResults.push(...(await fileAnalyzer.getAnalysisResults(fileContent)));
            }

            const hash = createHash("sha512").update(fileContent, "utf-8").digest("base64");

            this.updateFileInformation({
                path: filePath,
                extension: fileExtension,
                dependencies: dependencies,
                hash: hash,
                analysisResults: analysisResults,
            });
        }
        private updateFileInformation(file: IBuildContextFile) {
            let existingEntry = this.files.find((x) => x.path === file.path);

            if (existingEntry === undefined) {
                this.files.push(file);
            } else {
                existingEntry.dependencies = file.dependencies;
                existingEntry.hash = file.hash;
                existingEntry.analysisResults = file.analysisResults;
            }
        }
    }

    export class Builder implements IBuilder {
        private compiledFiles: {
            path: string;
            hash: string;
        }[] = [];

        private files: {
            path: string;
            dependentFilesPaths: string[];
        }[] = [];

        public constructor(
            private BuildContext: IBuildContext,
            private BuildOptions: IBuildOptions,
            private fileCompilers: IFileCompiler[]
        ) {}

        async buildAll(): Promise<void> {
            await this.BuildContext.analyzeAllFiles();

            const files = this.BuildContext.getAllFiles();

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileCompilers = this.fileCompilers.filter((x) => x.fileExtension === file.extension);

                for (let j = 0; j < fileCompilers.length; j++) {
                    const fileCompiler = fileCompilers[j];

                    await fileCompiler.build(file.path);
                }
            }
        }
        async build(filePath: string): Promise<void> {
            throw new Error("Method not implemented.");
        }
        private buildInvertedDependencies() {
            const files = this.BuildContext.getAllFiles();
            this.files = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const filePath = file.path;
                const dependenciesFilePaths = file.dependencies;

                for (let j = 0; dependenciesFilePaths.length; j++) {
                    const dependencyFilePath = dependenciesFilePaths[j];

                    const invertedDependency = this.files.find((x) => x.path === dependencyFilePath);

                    if (invertedDependency === undefined) {
                        this.files.push({
                            path: dependencyFilePath,
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
