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
        private functionExecutors: MarkdownBuild.IFunctionExecutor[]
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
                    new MarkdownBuild.FunctionExecutionContext(_function.parameters, context.path, context.relativePath)
                );

                chunks.push(functionResult);
            }
        }

        chunks.push(context.content.substring(lastIndex));

        const markdownRenderedContent = chunks.join("");

        const md = new MarkdownIt({
            html: true,
        });

        const htmlRenderedContext = md.render(markdownRenderedContent);
        const fileExtension = this.fileSystem.getExtension(context.relativePath);
        const htmlFilePath = this.fileSystem.clearPath(
            this.buildOptions.outputDirectoryPath,
            context.relativePath.substring(0, context.relativePath.length - fileExtension.length) + "html"
        );

        await this.fileSystem.createOrOverwriteFile(htmlFilePath, htmlRenderedContext);
    }
}
