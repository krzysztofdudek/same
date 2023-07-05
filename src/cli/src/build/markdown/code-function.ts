import { ServiceProvider } from "../../infrastructure/service-provider.js";
import { Build } from "../../core/build.js";
import { FileSystem } from "../../infrastructure/file-system.js";
import { MarkdownBuild } from "../markdown.js";

export namespace CodeFunction {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileAnalyzer(serviceProvider, () => new CodeFunctionAnalyzer());

        Build.registerFileDependencyIntrospector(
            serviceProvider,
            () => new CodeFunctionDependencyIntrospector(serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );

        MarkdownBuild.registerFunctionExecutor(
            serviceProvider,
            () => new CodeFunctionExecutor(serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );
    }

    export class CodeFunctionAnalyzer implements Build.IFileAnalyzer {
        fileExtensions: string[] = ["md"];

        async getAnalysisResults(
            _path: string,
            _relativePath: string,
            content: string
        ): Promise<Build.AnalysisResult[]> {
            const analysisResults: Build.AnalysisResult[] = [];

            await MarkdownBuild.handleFunctions(content, async (functionName, parameters, line, column) => {
                if (functionName === "code") {
                    if (parameters.length === 0 || parameters[0].length === 0) {
                        analysisResults.push(
                            new Build.AnalysisResult(
                                Build.AnalysisResultType.Error,
                                "Code function requires first parameter specifying file path parameter.",
                                line,
                                column
                            )
                        );
                    } else if (parameters.length < 2 || parameters[1].length === 0) {
                        analysisResults.push(
                            new Build.AnalysisResult(
                                Build.AnalysisResultType.Error,
                                "Code function requires second parameter specifying code block language.",
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

    export class CodeFunctionDependencyIntrospector implements Build.IFileDependencyIntrospector {
        fileExtensions: string[] = ["md"];

        public constructor(private fileSystem: FileSystem.IFileSystem) {}

        async getDependencies(path: string, _relativePath: string, content: string): Promise<string[]> {
            const dependencies: string[] = [];

            await MarkdownBuild.handleFunctions(content, async (functionName, parameters) => {
                if (functionName === "code") {
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

    export class CodeFunctionExecutor implements MarkdownBuild.IFunctionExecutor {
        functionName: string = "code";

        public constructor(private fileSystem: FileSystem.IFileSystem) {}

        async execute(executionContext: MarkdownBuild.FunctionExecutionContext): Promise<string> {
            const codeFilePath = this.fileSystem.clearPath(
                this.fileSystem.getDirectory(executionContext.filePath),
                executionContext.parameters[0]
            );
            const codeLanguage = executionContext.parameters[1];

            const codeFileContent = await this.fileSystem.readFile(codeFilePath);

            return `\`\`\`${codeLanguage}\n${codeFileContent}\n\`\`\``;
        }
    }
}
