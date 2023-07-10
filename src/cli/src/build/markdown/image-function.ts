import { Build } from "../../core/build.js";
import { ServiceProvider } from "../../infrastructure/service-provider.js";
import { MarkdownBuild } from "../markdown.js";

const functionName = "image";

export namespace ImageFunction {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileAnalyzer(serviceProvider, () => new FileAnalyzer());

        MarkdownBuild.registerFunctionExecutor(serviceProvider, () => new FunctionExecutor());
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
                                "Image function requires first parameter specifying file path.",
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

        async execute(executionContext: MarkdownBuild.FunctionExecutionContext): Promise<string> {
            const url = executionContext.parameters[0];

            return `<img src="${url}"></img>`;
        }
    }
}
