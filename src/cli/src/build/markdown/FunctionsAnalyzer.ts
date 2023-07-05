import { Build } from "../../core/build.js";
import { handleFunctions } from "../shared.js";

export class FunctionsAnalyzer implements Build.IFileAnalyzer {
    fileExtensions: string[] = ["md"];

    async getAnalysisResults(_filePath: string, fileContent: string): Promise<Build.AnalysisResult[]> {
        const analysisResults: Build.AnalysisResult[] = [];

        await handleFunctions(fileContent, async (functionName, parameters, line, column) => {
            if (functionName === "import") {
                if (parameters.length === 0 || parameters[0].length === 0) {
                    analysisResults.push(
                        new Build.AnalysisResult(
                            Build.AnalysisResultType.Error,
                            "Import function requires file path parameter.",
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
