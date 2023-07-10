import { Build } from "../../core/build.js";
import { handleAllMatches, matchAll } from "../../core/regExp.js";
import { FileSystem } from "../../infrastructure/file-system.js";
import { ServiceProvider } from "../../infrastructure/service-provider.js";
import { MarkdownBuild } from "../markdown.js";

export namespace Link {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileAnalyzer(
            serviceProvider,
            () =>
                new FileAnalyzer(
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey)
                )
        );

        MarkdownBuild.registerPostProcessor(serviceProvider, () => new PostProcessor());
    }

    export class FileAnalyzer implements Build.IFileAnalyzer {
        fileExtensions: string[] = ["md"];

        public constructor(private fileSystem: FileSystem.IFileSystem, private buildOptions: Build.IOptions) {}

        async getAnalysisResults(
            path: string,
            _relativePath: string,
            content: string
        ): Promise<Build.AnalysisResult[]> {
            const analysisResults: Build.AnalysisResult[] = [];

            await handleAllMatches(content, /\[([^\]]+)\]\(([^)]+)\)/g, async (match, line, column) => {
                const resource = match[2];

                if (!resource.match(/\w+:\/\//)) {
                    const filePath = this.fileSystem.clearPath(
                        this.buildOptions.sourceDirectoryPath,
                        this.fileSystem.getDirectory(path).substring(this.buildOptions.sourceDirectoryPath.length + 1),
                        resource
                    );

                    if (!(await this.fileSystem.checkIfExists(filePath))) {
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

    export class PostProcessor implements MarkdownBuild.IPostProcessor {
        async execute(chunks: string[]): Promise<void> {
            for (let i = 0; i < chunks.length; i++) {
                let chunk = chunks[i];
                const matches = matchAll(chunk, /\[([^\]]+)\]\(([^)]+.md)\)/g);
                let indexDiff = 0;

                for (let j = 0; j < matches.length; j++) {
                    const match = matches[j];
                    const startIndex = match.index! + indexDiff;
                    const endIndex = startIndex + match[0].length;
                    const title = match[1];
                    const url = `${match[2].substring(0, match[2].length - 2)}html`;
                    indexDiff += 2;

                    chunk = `${chunk.substring(0, startIndex)}[${title}](${url})${chunk.substring(endIndex)}`;
                }

                chunks[i] = chunk;
            }
        }
    }
}
