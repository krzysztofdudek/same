import { ServiceProvider } from "../../infrastructure/service-provider.js";
import { Build } from "../../core/build.js";
import { FileSystem } from "../../infrastructure/file-system.js";
import { MarkdownBuild } from "../markdown.js";

export namespace ImportFunction {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileAnalyzer(serviceProvider, () => new ImportFunctionAnalyzer());

        Build.registerFileDependencyIntrospector(
            serviceProvider,
            () => new ImportFunctionDependencyIntrospector(serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );

        MarkdownBuild.registerFunctionExecutor(
            serviceProvider,
            () => new ImportFunctionExecutor(serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );
    }

    export class ImportFunctionAnalyzer implements Build.IFileAnalyzer {
        fileExtensions: string[] = ["md"];

        async getAnalysisResults(
            _path: string,
            _relativePath: string,
            content: string
        ): Promise<Build.AnalysisResult[]> {
            const analysisResults: Build.AnalysisResult[] = [];

            await MarkdownBuild.handleFunctions(content, async (functionName, parameters, line, column) => {
                if (functionName === "import") {
                    if (parameters.length === 0 || parameters[0].length === 0) {
                        analysisResults.push(
                            new Build.AnalysisResult(
                                Build.AnalysisResultType.Error,
                                "Import function requires first parameter specifying file path parameter.",
                                line,
                                column
                            )
                        );
                    }

                    if (parameters[0].endsWith(".dsl") && parameters.length !== 2) {
                        analysisResults.push(
                            new Build.AnalysisResult(
                                Build.AnalysisResultType.Error,
                                'Import function of "dsl" file requires second parameters specified with diagram name.',
                                line,
                                column
                            )
                        );
                    }
                }
            });

            return analysisResults;
        }
    }

    export class ImportFunctionDependencyIntrospector implements Build.IFileDependencyIntrospector {
        fileExtensions: string[] = ["md"];

        public constructor(private fileSystem: FileSystem.IFileSystem) {}

        async getDependencies(path: string, _relativePath: string, content: string): Promise<string[]> {
            const dependencies: string[] = [];

            await MarkdownBuild.handleFunctions(content, async (functionName, parameters) => {
                if (functionName === "import") {
                    const dependency = this.fileSystem.clearPath(this.fileSystem.getDirectory(path), parameters[0]);

                    if (dependencies.indexOf(dependency) !== -1) {
                        return;
                    }

                    dependencies.push(dependency);
                }
            });

            return dependencies;
        }
    }

    export class ImportFunctionExecutor implements MarkdownBuild.IFunctionExecutor {
        functionName: string = "import";

        public constructor(private fileSystem: FileSystem.IFileSystem) {}

        async execute(executionContext: MarkdownBuild.FunctionExecutionContext): Promise<string> {
            const filePath = this.fileSystem.clearPath(
                this.fileSystem.getDirectory(executionContext.filePath),
                executionContext.parameters[0]
            );

            const fileContent = await this.fileSystem.readFile(filePath);

            return fileContent;
        }
    }
}
