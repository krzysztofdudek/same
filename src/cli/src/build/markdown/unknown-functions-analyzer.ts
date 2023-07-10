import { Build } from "../../core/build.js";
import { MarkdownBuild } from "../markdown.js";

export class UnknownFunctionsAnalyzer implements Build.IFileAnalyzer {
    fileExtensions: string[] = ["md"];

    public constructor(private functionExecutors: MarkdownBuild.IFunctionExecutor[]) {}

    async getAnalysisResults(_path: string, _relativePath: string, content: string): Promise<Build.AnalysisResult[]> {
        const analysisResults: Build.AnalysisResult[] = [];

        const functions = MarkdownBuild.matchAllFunctions(content);

        functions.forEach((x) => {
            if (this.functionExecutors.findIndex((y) => y.functionName === x.functionName) === -1) {
                analysisResults.push(
                    new Build.AnalysisResult(
                        Build.AnalysisResultType.Error,
                        `\"${x.functionName}\" is not a supported function.`,
                        x.line,
                        x.column
                    )
                );
            }
        });

        return analysisResults;
    }
}
