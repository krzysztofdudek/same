import { Build } from "../../core/build.js";
import { FileSystem } from "../../infrastructure/file-system.js";
import { MarkdownBuild } from "../markdown.js";

export class LinksAnalyzer implements Build.IFileAnalyzer {
    fileExtensions: string[] = ["md"];

    public constructor(private fileSystem: FileSystem.IFileSystem) {}

    async getAnalysisResults(_path: string, _relativePath: string, content: string): Promise<Build.AnalysisResult[]> {
        const analysisResults: Build.AnalysisResult[] = [];

        await MarkdownBuild.handleAllMatches(content, /\[([^\]]+)\]\(([^)]+)\)/g, async (match, line, column) => {
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
