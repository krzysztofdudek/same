import { Build } from "../../core/build.js";
import { handleAllMatches, matchAll } from "../../core/regExp.js";
import { FileSystem } from "../../infrastructure/file-system.js";
import { ServiceProvider } from "../../infrastructure/service-provider.js";
import { Publish } from "../../publish/publish-static-files.js";
import { MarkdownBuild } from "../markdown.js";

const regExp = /\[([^\]]+)\]\(([^)#]+)(#?)([\w\d\-]*)\)/g;

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

        MarkdownBuild.registerPostProcessor(
            serviceProvider,
            () =>
                new PostProcessor(
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey),
                    serviceProvider.resolve(Publish.iOptionsServiceKey)
                )
        );
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

            await handleAllMatches(content, regExp, async (match, line, column) => {
                const link = match[2];
                const anchorSet = match[3] === "#";
                const anchor = match[4] || null;

                if (!link.match(/\w+:\/\//)) {
                    const filePath = this.fileSystem.clearPath(
                        this.buildOptions.sourceDirectoryPath,
                        this.fileSystem.getDirectory(path).substring(this.buildOptions.sourceDirectoryPath.length + 1),
                        decodeURI(link)
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

                    if (!anchorSet) {
                        return;
                    }

                    if ((anchor?.length ?? 0) < 1) {
                        analysisResults.push(
                            new Build.AnalysisResult(
                                Build.AnalysisResultType.Warning,
                                "Anchor name is not specified.",
                                line,
                                column
                            )
                        );

                        return;
                    }

                    const fileContent = await this.fileSystem.readFile(filePath);

                    const headerMatches = matchAll(fileContent, /\n\s*#+\s*([^\n]+)\n/g).map((x) => {
                        const words = matchAll(x[1], /(\w+)/g).map((x) => x[1]);

                        return words.map((y) => y.toLowerCase()).join("-");
                    });

                    if (headerMatches.findIndex((x) => x === anchor) === -1) {
                        analysisResults.push(
                            new Build.AnalysisResult(
                                Build.AnalysisResultType.Warning,
                                "Anchor in the linked file does not exist.",
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
        public constructor(
            private fileSystem: FileSystem.IFileSystem,
            private buildOptions: Build.IOptions,
            private publishOptions: Publish.IOptions
        ) {}

        async execute(chunks: string[], context: Build.FileBuildContext): Promise<void> {
            for (let i = 0; i < chunks.length; i++) {
                let chunk = chunks[i];
                const matches = matchAll(chunk, regExp);
                let indexDiff = 0;

                for (let j = 0; j < matches.length; j++) {
                    const match = matches[j];
                    const startIndex = match.index! + indexDiff;
                    const endIndex = startIndex + match[0].length;
                    const title = match[1];
                    const link = match[2];
                    const anchor = match[4] || null;

                    const absoluteFilePath = this.fileSystem.clearPath(
                        this.fileSystem.getDirectory(context.path),
                        link
                    );
                    const fileExtension = this.fileSystem.getExtension(absoluteFilePath);

                    const urlFragment =
                        absoluteFilePath.substring(
                            this.buildOptions.sourceDirectoryPath.length + 1,
                            absoluteFilePath.length - fileExtension.length
                        ) + "html";

                    const linkRender = `[${title}](${this.publishOptions.createBaseUrl()}/${urlFragment}${
                        anchor !== null ? `#${anchor}` : ""
                    })`;

                    indexDiff = indexDiff - match[0].length + linkRender.length;

                    chunk = `${chunk.substring(0, startIndex)}${linkRender}${chunk.substring(endIndex)}`;
                }

                chunks[i] = chunk;
            }
        }
    }
}
