import { ServiceProvider } from "../../infrastructure/service-provider.js";
import { Build } from "../../core/build.js";
import { FileSystem } from "../../infrastructure/file-system.js";
import { MarkdownBuild } from "../markdown.js";
import { parameterDependencyIntrospector } from "./parameter-dependency-introspector.js";

const functionName = "code";

export namespace CodeFunction {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileAnalyzer(serviceProvider, () => new FileAnalyzer());

        Build.registerFileDependencyIntrospector(serviceProvider, () =>
            parameterDependencyIntrospector(functionName, 0, serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );

        MarkdownBuild.registerFunctionExecutor(
            serviceProvider,
            () => new FunctionExecutor(serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
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
                                "Code function requires first parameter specifying file path.",
                                _function.line,
                                _function.column
                            )
                        );
                    } else if (_function.parameters.length < 2 || _function.parameters[1].length === 0) {
                        analysisResults.push(
                            new Build.AnalysisResult(
                                Build.AnalysisResultType.Error,
                                "Code function requires second parameter specifying code block language.",
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
