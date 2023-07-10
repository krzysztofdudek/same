import MarkdownIt from "markdown-it";
import { Build } from "../../core/build.js";
import { FileSystem } from "../../infrastructure/file-system.js";
import { MarkdownBuild } from "../markdown.js";

export class FileBuilder implements Build.IFileBuilder {
    fileExtensions: string[] = ["md"];
    outputType = "html";

    public constructor(
        private fileSystem: FileSystem.IFileSystem,
        private buildOptions: Build.IOptions,
        private functionExecutors: MarkdownBuild.IFunctionExecutor[],
        private postProcessors: MarkdownBuild.IPostProcessor[]
    ) {}

    async build(context: Build.FileBuildContext): Promise<void> {
        const chunks: string[] = [];
        const functions = MarkdownBuild.matchAllFunctions(context.content);
        let lastIndex = 0;

        for (let i = 0; i < functions.length; i++) {
            const _function = functions[i];

            chunks.push(context.content.substring(lastIndex, _function.match.index!));
            lastIndex = _function.match.index! + _function.match[0].length;

            const functionExecutor = this.functionExecutors.find((x) => x.functionName === _function.functionName);

            if (functionExecutor) {
                const functionResult = await functionExecutor.execute(
                    new MarkdownBuild.FunctionExecutionContext(
                        _function.parameters,
                        context.path,
                        context.relativePath,
                        context.extension
                    )
                );

                chunks.push(functionResult);
            }
        }

        chunks.push(context.content.substring(lastIndex));

        for (let i = 0; i < this.postProcessors.length; i++) {
            const postProcessor = this.postProcessors[i];

            await postProcessor.execute(chunks);
        }

        const markdownRenderedContent = chunks.join("");

        const md = new MarkdownIt({
            html: true,
        });

        const render = md.render(markdownRenderedContent);
        const outputFilePath = this.fileSystem.clearPath(
            this.buildOptions.outputDirectoryPath,
            context.relativePath.substring(0, context.relativePath.length - context.extension.length) + "html"
        );

        await this.fileSystem.createOrOverwriteFile(outputFilePath, render);
    }
}
