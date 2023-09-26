import { create } from "domain";
import { Build } from "../../core/build.js";
import { handleAllMatches, matchAll } from "../../core/regExp.js";
import { FileSystem } from "../../infrastructure/file-system.js";
import { ServiceProvider } from "../../infrastructure/service-provider.js";
import { Publish } from "../../publish/publish.js";
import { MarkdownBuild } from "../markdown.js";

const regExp = /\[([^\]]+)\]\(([^)#]+)(#?)([\w\d\-\%\+]*)\)/g;
const headersRegExp = /^(\s*)(#+)\s*([^\n]+)(\n)^/gm;
const remoteResourceRegExp = /\w+:\/\//;

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
                new LinkPostProcessor(
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey),
                    serviceProvider.resolve(Publish.iOptionsServiceKey)
                )
        );

        MarkdownBuild.registerPostProcessor(serviceProvider, () => new HeaderPostProcessor());
    }

    function createAnchor(content: string): string {
        const words = matchAll(content, /(\w+)/g).map((x) => x[1]);

        return words
            .map((y) => y.toLowerCase())
            .filter((x) => x.length !== 0)
            .join("-");
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

                if (link.match(remoteResourceRegExp)) {
                    return;
                }

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

                const headerMatches = matchAll(fileContent, headersRegExp).map((x) => createAnchor(x[3]));

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
            });

            return analysisResults;
        }
    }

    export class HeaderPostProcessor implements MarkdownBuild.IPostProcessor {
        async execute(chunks: string[], _context: Build.FileBuildContext): Promise<void> {
            for (let i = 0; i < chunks.length; i++) {
                let chunk = chunks[i];
                const matches = matchAll(chunk, headersRegExp);
                let indexDiff = 0;

                for (let j = 0; j < matches.length; j++) {
                    const match = matches[j];
                    const startIndex = match.index! + indexDiff;
                    const endIndex = startIndex + match[0].length;
                    const prefix = match[1];
                    const headerSize = match[2].length;
                    const content = match[3];
                    const postfix = match[4];

                    const anchor = createAnchor(content);
                    const render = `${prefix}<h${headerSize} id="${anchor}">${content}<a href="#${anchor}" style="vertical-align: super; font-size: 14px">📎</a></h${headerSize}>${postfix}`;

                    indexDiff = indexDiff - match[0].length + render.length;

                    chunk = `${chunk.substring(0, startIndex)}${render}${chunk.substring(endIndex)}`;
                }

                chunks[i] = chunk;
            }
        }
    }

    export class LinkPostProcessor implements MarkdownBuild.IPostProcessor {
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

                    if (link.match(remoteResourceRegExp)) {
                        continue;
                    }

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
