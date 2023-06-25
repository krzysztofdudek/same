import { ServiceProvider } from "../infrastructure/service-provider";
import { FileSystem } from "../infrastructure/file-system";
import { createHash } from "crypto";

export namespace Compilation {
    export const iCompilationOptionsServiceKey = "Compilation.ICompilationOptions";
    export const iCompilationContextServiceProvider = "Compilation.ICompilationContext";
    export const iDependencyFinderServiceKey = "Compilation.IDependencyFinder";
    export const iFileAnalyzerServiceKey = "Compilation.IFileAnalyzer";
    export const iFileCompilerServiceKey = "Compilation.IFileCompiler";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iCompilationOptionsServiceKey,
            () =>
                <ICompilationOptions>{
                    outputDirectoryPath: "",
                    sourceDirectoryPath: "",
                }
        );

        serviceProvider.registerSingleton(
            iCompilationContextServiceProvider,
            () =>
                new CompilationContext(
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(iCompilationOptionsServiceKey),
                    serviceProvider.resolveMany(iDependencyFinderServiceKey),
                    serviceProvider.resolveMany(iFileAnalyzerServiceKey)
                )
        );
    }

    export function registerDependencyFinder(
        serviceProvider: ServiceProvider.IServiceProvider,
        factory: () => IDependencyFinder
    ) {
        serviceProvider.registerSingleton(iDependencyFinderServiceKey, factory);
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
        serviceProvider.registerSingleton(iFileCompilerServiceKey, factory);
    }

    export interface ICompilationOptions {
        sourceDirectoryPath: string;
        outputDirectoryPath: string;
    }

    export interface ICompilationContext {
        analyzeAllFiles(): Promise<void>;
        analyzeFile(filePath: string): Promise<void>;
        getAllFiles(): ICompilationContextFile[];
        getFile(filePath: string): ICompilationContextFile | undefined;
    }

    export interface ICompiler {
        compileAll(): Promise<void>;
        compile(filePath: string): Promise<void>;
    }

    export interface IFileCompiler {
        fileExtension: string;

        compile(filePath: string): Promise<void>;
    }

    export interface IDependencyFinder {
        fileExtension: string;

        getDependencies(fileContent: string): Promise<string[]>;
    }

    export interface IFileAnalyzer {
        fileExtension: string;

        getAnalysisResults(fileContent: string): Promise<string[]>;
    }

    interface ICompilationContextFile {
        path: string;
        extension: string;
        dependencies: string[];
        hash: string;
        analysisResults: string[];
    }

    export class CompilationContext implements ICompilationContext {
        private files: ICompilationContextFile[] = [];

        private invertedDependencies: {
            dependencyFilePath: string;
            dependentFilesPaths: string[];
        }[] = [];

        public constructor(
            private fileSystem: FileSystem.IFileSystem,
            private compilerOptions: ICompilationOptions,
            private dependencyFinders: IDependencyFinder[],
            private fileAnalyzers: IFileAnalyzer[]
        ) {}

        getAllFiles(): ICompilationContextFile[] {
            return this.files;
        }
        getFile(filePath: string): ICompilationContextFile | undefined {
            return this.files.find((x) => x.path === filePath);
        }
        async analyzeAllFiles(): Promise<void> {
            this.files = [];

            const filesPaths = await this.fileSystem.getFilesRecursively(this.compilerOptions.sourceDirectoryPath);

            for (let i = 0; i < filesPaths.length; i++) {
                const filePath = filesPaths[i];

                await this.refreshFile(filePath);
            }

            this.buildInvertedDependencies();
        }
        async analyzeFile(filePath: string): Promise<void> {
            await this.refreshFile(filePath);

            this.buildInvertedDependencies();
        }
        private async refreshFile(filePath: string): Promise<void> {
            const fileExtension = this.fileSystem.getExtension(filePath);
            const dependencyFinders = this.dependencyFinders.filter((x) => x.fileExtension === fileExtension);
            const fileAnalyzers = this.fileAnalyzers.filter((x) => x.fileExtension === fileExtension);
            const dependenciesFilePaths: string[] = [];
            const analysisResults: string[] = [];

            const fileContent = await this.fileSystem.readFile(filePath);

            for (let j = 0; j < dependencyFinders.length; j++) {
                const dependencyFinder = dependencyFinders[j];

                dependenciesFilePaths.push(...(await dependencyFinder.getDependencies(fileContent)));
            }

            for (let j = 0; j < fileAnalyzers.length; j++) {
                const fileAnalyzer = fileAnalyzers[j];

                analysisResults.push(...(await fileAnalyzer.getAnalysisResults(fileContent)));
            }

            const hash = createHash("sha512").update(fileContent, "utf-8").digest("base64");

            this.saveFile({
                path: filePath,
                extension: fileExtension,
                dependencies: dependenciesFilePaths,
                hash: hash,
                analysisResults: analysisResults,
            });
        }
        private saveFile(file: ICompilationContextFile) {
            let existingEntry = this.files.find((x) => x.path === file.path);

            if (existingEntry === undefined) {
                this.files.push(file);
            } else {
                file.dependencies = file.dependencies;
                file.hash = file.hash;
            }
        }
        private buildInvertedDependencies() {
            this.invertedDependencies = [];

            for (let i = 0; i < this.files.length; i++) {
                const file = this.files[i];
                const filePath = file.path;
                const dependenciesFilePaths = file.dependencies;

                for (let j = 0; dependenciesFilePaths.length; j++) {
                    const dependencyFilePath = dependenciesFilePaths[j];

                    const invertedDependency = this.invertedDependencies.find(
                        (x) => x.dependencyFilePath === dependencyFilePath
                    );

                    if (invertedDependency === undefined) {
                        this.invertedDependencies.push({
                            dependencyFilePath: dependencyFilePath,
                            dependentFilesPaths: [filePath],
                        });
                    } else {
                        invertedDependency.dependentFilesPaths.push(filePath);
                    }
                }
            }
        }
    }

    export class Compiler implements ICompiler {
        private files: {
            filePath: string;
            compiledHash: string;
        }[] = [];

        public constructor(
            private compilationContext: ICompilationContext,
            private compilationOptions: ICompilationOptions,
            private fileCompilers: IFileCompiler[]
        ) {}

        async compileAll(): Promise<void> {
            await this.compilationContext.analyzeAllFiles();

            const files = this.compilationContext.getAllFiles();

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileCompilers = this.fileCompilers.filter((x) => x.fileExtension === file.extension);

                for (let j = 0; j < fileCompilers.length; j++) {
                    const fileCompiler = fileCompilers[j];

                    await fileCompiler.compile(file.path);
                }
            }
        }
        async compile(filePath: string): Promise<void> {
            throw new Error("Method not implemented.");
        }
    }
}
