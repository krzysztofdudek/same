import { Build } from "../../core/build.js";
import { FileSystem } from "../../infrastructure/file-system.js";
import { handleMatches } from "../shared.js";

export class LinksAnalyzer implements Build.IFileAnalyzer {
    fileExtensions: string[] = ["md"];

    public constructor(private fileSystem: FileSystem.IFileSystem) {}

    async getAnalysisResults(_filePath: string, fileContent: string): Promise<Build.AnalysisResult[]> {
        const analysisResults: Build.AnalysisResult[] = [];

        await handleMatches(fileContent, /\[([^\]]+)\]\(([^)]+)\)/g, async (match, line, column) => {
            const resource = match[2];

            if (resource.match(/\w+:\/\//)) {
            } else {
                const path = this.fileSystem.clearPath(resource);

                if (!(await this.fileSystem.checkIfExists(path))) {
                    analysisResults.push(
                        new Build.AnalysisResult(
                            Build.AnalysisResultType.Warning,
                            "Linked file does not exists.",
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
