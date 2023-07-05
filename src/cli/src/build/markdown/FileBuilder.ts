import MarkdownIt from "markdown-it";
import { Build } from "../../core/build.js";
import { matchAllFunctions } from "../shared.js";
import { FileSystem } from "../../infrastructure/file-system.js";

export const IFunctionHandlerServiceKey = "MarkdownBuild.IFunctionHandler";

export interface IFunctionHandler {
    functionName: string;

    handle(parameters: string[]): Promise<string>;
}

export class FileBuilder implements Build.IFileBuilder {
    fileExtensions: string[] = ["md"];

    public constructor(
        private fileSystem: FileSystem.IFileSystem,
        private buildOptions: Build.IOptions,
        private functionHandlers: IFunctionHandler[]
    ) {}

    async build(filePath: string, fileContent: string): Promise<void> {
        const chunks: string[] = [];
        const functions = matchAllFunctions(fileContent);
        let lastIndex = 0;

        for (let i = 0; i < functions.length; i++) {
            const _function = functions[i];

            chunks.push(fileContent.substring(lastIndex, _function.match.index!));
            lastIndex = _function.match.index! + _function.match[0].length;

            const functionHandler = this.functionHandlers.find((x) => x.functionName === _function.functionName);

            if (functionHandler) {
                const functionResult = await functionHandler.handle(_function.parameters);

                chunks.push(functionResult);
            }
        }

        chunks.push(fileContent.substring(lastIndex));

        const markdownRenderedContent = chunks.join("");

        const md = new MarkdownIt({
            html: true,
        });

        const htmlRenderedContext = md.render(markdownRenderedContent);
        const fileExtension = this.fileSystem.getExtension(filePath);
        const startIndex = this.buildOptions.sourceDirectoryPath.length + 1;
        const htmlFilePath = this.fileSystem.clearPath(
            this.buildOptions.outputDirectoryPath,
            filePath.substring(startIndex, filePath.length - fileExtension.length) + "html"
        );

        await this.fileSystem.createOrOverwriteFile(htmlFilePath, htmlRenderedContext);
    }
}
