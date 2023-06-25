import path from "path";
import { iterateOverFilesInDirectory } from "../core/file-system.js";
import { Structurizr } from "../tools/structurizr.js";

export namespace StructurizrTransformation {
    export interface Options {
        workingDirectoryPath: string;
        outputDirectoryPath: string;
        toolsDirectoryPath: string;
    }

    export async function transformAllFiles(options: Options, tool: Structurizr.Tool) {
        console.debug("Transforming Structurizr files.");

        await iterateOverFilesInDirectory(options.workingDirectoryPath, ["dsl"], async (filePath) => {
            await transformSingleFile(filePath, options, tool);
        });

        console.debug("Structurizr files transformed.");
    }

    export async function transformSingleFile(filePath: string, options: Options, tool: Structurizr.Tool) {
        console.debug(`Transforming: ${filePath}`);

        const extension = path.extname(filePath);
        let directory = filePath.replace(options.workingDirectoryPath, "");
        directory = directory.substring(1, directory.length - extension.length);

        const outputPath = path.join(options.outputDirectoryPath, "diagrams", directory).replaceAll(/\\/g, "/");

        await tool.generateDiagrams(filePath, outputPath);

        console.debug(`Transformed: ${filePath}`);
    }
}
