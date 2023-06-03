import path from 'path';
import downloadFile from "../core/download-file.js";
import { getLatestRelease } from '../core/github.js';
import setupTool from '../core/setup-tool.js';
import { ChildProcess, exec } from 'child_process';
import { ToolBase } from '../core/tool.js';
import { encode64, zip_deflate } from '../core/deflate.js'
import { createDirectoryIfNotExists } from '../core/file-system.js';

const toolName = 'PlantUml';
const toolFileName = 'plantuml.jar';

export namespace PlantUml {
    export async function configure(toolsDirectoryPath: string): Promise<Tool> {
        const tool = new Tool(toolsDirectoryPath);

        await tool.configure();

        return tool;
    }

    export class Tool extends ToolBase {
        private jarPath: string;
        private toolsDirectoryPath: string;

        public constructor(toolsDirectoryPath: string) {
            super();

            this.jarPath = path.join(toolsDirectoryPath, toolFileName);
            this.toolsDirectoryPath = toolsDirectoryPath;
        }

        async configure() {
            const versionDescriptor = await getLatestRelease(toolName, 'plantuml', 'plantuml', /plantuml\.jar/);

            await createDirectoryIfNotExists(this.toolsDirectoryPath);

            await setupTool(this.toolsDirectoryPath, toolName, versionDescriptor.name, async () => {
                await downloadFile(toolName, versionDescriptor.url, this.jarPath);
            });
        }

        public runServer(port: number): Server {
            console.debug(`Running PlantUML server on port: ${port}`);

            return new Server(this.jarPath, port);
        }
    }

    export class Server {
        private process: ChildProcess;
        private port: number;

        constructor(jarPath: string, port: number) {
            this.process = exec(`java -jar "${jarPath}" -picoweb:${port}`, );
            this.port = port;
        }

        public kill() {
            this.process.kill();
        }

        public async getSvg(code: string): Promise<string> {
            const zippedCode = encode64(
                zip_deflate(
                    unescape(encodeURIComponent(code)),
                    9
                )
            );

            const response = await fetch(`http://localhost:${this.port}/plantuml/svg/${zippedCode}`);

            return await response.text();
        }
    }
}