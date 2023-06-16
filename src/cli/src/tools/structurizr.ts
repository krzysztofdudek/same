import path from 'path';
import { createDirectoryIfNotExists as createDirectoryIfNotExists, deleteIfExists } from '../core/file-system.js';
import downloadFile from "../core/download-file.js";
import { getLatestRelease } from '../core/github.js';
import setupTool from '../core/setup-tool.js';
import decompress from 'decompress';
import { ToolBase } from '../core/tool.js';
import { exec } from "child_process";
import { setTimeout } from "timers/promises";
import fsPromises from 'fs/promises';
import fs from 'fs';

const toolName = "Structurizr";
const toolFileName = 'structurizr.zip';
const decompressedDirectory = "structurizr";

export namespace Structurizr {
    export async function configure(toolsDirectoryPath: string): Promise<Tool> {
        const tool = new Tool(toolsDirectoryPath);

        await tool.configure();

        return tool;
    }

    export class Tool extends ToolBase {
        private toolsDirectoryPath: string;

        public constructor(toolsDirectory: string) {
            super();

            this.toolsDirectoryPath = toolsDirectory;
        }

        async configure() {
            const versionDescriptor = await getLatestRelease(toolName, 'structurizr', 'cli', /structurizr\-cli\-.+\.zip/);

            await createDirectoryIfNotExists(this.toolsDirectoryPath);

            await setupTool(this.toolsDirectoryPath, toolName, versionDescriptor.name, async () => {
                const zipPath = path.join(this.toolsDirectoryPath, toolFileName);
                const unzippedDirectory = path.join(this.toolsDirectoryPath, decompressedDirectory);

                await deleteIfExists(unzippedDirectory);

                await downloadFile(toolName, versionDescriptor.url, zipPath);

                console.debug(`Decompressing ${toolName}.`);

                await decompress(zipPath, unzippedDirectory);

                console.debug(`${toolName} decompressed.`);

                await deleteIfExists(zipPath);
            });
        }

        async generateDiagrams(filePath: string, outputDirectoryPath: string) {
            if (fs.existsSync(outputDirectoryPath)) {
                await fsPromises.rm(outputDirectoryPath, {
                    recursive: true
                });
            }

            createDirectoryIfNotExists(outputDirectoryPath);

            const jarPath = path.join(this.toolsDirectoryPath, decompressedDirectory, "lib").replaceAll(/\\/g, '/');

            const process = exec(`java -cp "${jarPath}/*" com.structurizr.cli.StructurizrCliApplication export -workspace "${filePath}" -format plantuml/c4plantuml -output "${outputDirectoryPath}"`);

            process.stderr?.on('data', data => {
                console.error(`Structurizr error: ${data}`);
            });

            while (process.exitCode === null) {
                await setTimeout(100);
            }
        }
    }
}