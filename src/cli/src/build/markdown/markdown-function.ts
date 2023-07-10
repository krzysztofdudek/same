import { ServiceProvider } from "../../infrastructure/service-provider.js";
import { Build } from "../../core/build.js";
import { FileSystem } from "../../infrastructure/file-system.js";
import { MarkdownBuild } from "../markdown.js";
import { parameterDependencyIntrospector } from "./parameter-dependency-introspector.js";

const functionName = "markdown";

export namespace MarkdownFunction {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileAnalyzer(serviceProvider, () => new FileAnalyzer());

        Build.registerFileDependencyIntrospector(serviceProvider, () =>
            parameterDependencyIntrospector(functionName, 0, serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
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

                if (_function.functionName === functionName) {
                    if (_function.parameters.length === 0 || _function.parameters[0].length === 0) {
                        analysisResults.push(
                            new Build.AnalysisResult(
                                Build.AnalysisResultType.Error,
                                "Markdown function requires first parameter specifying file path.",
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

    export class FunctionExecutor implements MarkdownBuild.IFunctionExecutor {
        functionName: string = functionName;

        public constructor(private fileSystem: FileSystem.IFileSystem, private buildOptions: Build.IOptions) {}

        async execute(executionContext: MarkdownBuild.FunctionExecutionContext): Promise<string> {
            const fileExtension = this.fileSystem.getExtension(executionContext.filePath);

            const filePath = this.fileSystem.clearPath(
                this.buildOptions.outputDirectoryPath,
                this.fileSystem
                    .getDirectory(executionContext.filePath)
                    .substring(this.buildOptions.sourceDirectoryPath.length + 1),
                `${executionContext.parameters[0].substring(
                    0,
                    executionContext.parameters[0].length - fileExtension.length
                )}html`
            );

            const fileContent = await this.fileSystem.readFile(filePath);

            return fileContent;
        }
    }
}
