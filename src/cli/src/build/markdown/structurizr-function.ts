import { Build } from "../../core/build.js";
import { ServiceProvider } from "../../infrastructure/service-provider.js";
import { FileSystem } from "../../infrastructure/file-system.js";
import { MarkdownBuild } from "../markdown.js";

const functionName = "structurizr";

export namespace StructurizrFunction {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileAnalyzer(serviceProvider, () => new FileAnalyzer());

        Build.registerFileDependencyIntrospector(
            serviceProvider,
            () => new FileDependencyIntrospector(serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );

        MarkdownBuild.registerFunctionExecutor(
            serviceProvider,
            () =>
                new FunctionExecutor(
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey)
                )
        );
    }

    export class FileAnalyzer implements Build.IFileAnalyzer {
        fileExtensions: string[] = ["md"];

        async getAnalysisResults(
            _path: string,
            _relativePath: string,
            content: string
        ): Promise<Build.AnalysisResult[]> {
            const analysisResults: Build.AnalysisResult[] = [];

            const functions = MarkdownBuild.matchAllFunctions(content);

            for (let i = 0; i < functions.length; i++) {
                const _function = functions[i];

                if (_function.functionName == functionName) {
                    if (_function.parameters.length === 0 || _function.parameters[0].length === 0) {
                        analysisResults.push(
                            new Build.AnalysisResult(
                                Build.AnalysisResultType.Error,
                                "Structurizr function requires first parameter specifying file path parameter.",
                                _function.line,
                                _function.column
                            )
                        );
                    } else if (_function.parameters.length < 2 || _function.parameters[1].length === 0) {
                        analysisResults.push(
                            new Build.AnalysisResult(
                                Build.AnalysisResultType.Error,
                                "Structurizr function requires second parameter specifying view name.",
                                _function.line,
                                _function.column
                            )
                        );
                    }
                }
            }

            return analysisResults;
        }
    }

    export class FileDependencyIntrospector implements Build.IFileDependencyIntrospector {
        fileExtensions: string[] = ["md"];

        public constructor(private fileSystem: FileSystem.IFileSystem) {}

        async getDependencies(path: string, _relativePath: string, content: string): Promise<string[]> {
            const dependencies: string[] = [];

            const functions = MarkdownBuild.matchAllFunctions(content);

            for (let i = 0; i < functions.length; i++) {
                const _function = functions[i];

                if (_function.functionName === functionName) {
                    const dependency = this.fileSystem.clearPath(
                        this.fileSystem.getDirectory(path),
                        _function.parameters[0]
                    );

                    if (dependencies.indexOf(dependency) !== -1) {
                        continue;
                    }

                    dependencies.push(dependency);
                }
            }

            return dependencies;
        }
    }

    export class FunctionExecutor implements MarkdownBuild.IFunctionExecutor {
        functionName: string = functionName;

        public constructor(private fileSystem: FileSystem.IFileSystem, private buildOptions: Build.IOptions) {}

        async execute(executionContext: MarkdownBuild.FunctionExecutionContext): Promise<string> {
            const filePath = this.fileSystem.clearPath(
                this.buildOptions.outputDirectoryPath,
                this.fileSystem
                    .getDirectory(executionContext.filePath)
                    .substring(this.buildOptions.sourceDirectoryPath.length + 1),
                executionContext.parameters[0],
                `${executionContext.parameters[1]}.svg`
            );

            const fileContent = await this.fileSystem.readFile(filePath);

            return fileContent;
        }
    }
}
