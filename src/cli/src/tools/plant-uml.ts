import { IGitHub } from '../core/github.js';
import { ConfigurationError, ITool, IToolsetVersions } from '../core/tool.js';
import { encode64, zip_deflate } from '../core/deflate.js'
import { IToolsOptions } from './tools-options.js';
import { IFileSystem } from '../infrastructure/abstraction/file-system.js';
import { IHttpClient } from '../infrastructure/abstraction/http-client.js';
import { IProcess, IShell } from '../infrastructure/abstraction/shell.js';
import { IServiceProvider } from '../infrastructure/abstraction/service-provider.js';

const toolName = 'PlantUml';
const toolFileName = 'plantuml.jar';

export namespace PlantUml {
    export function register(serviceProvider: IServiceProvider) {
        serviceProvider.register('plantUmlOptions', () => <IOptions> {
            serverPort: 10000
        });

        serviceProvider.register('plantUmlTool', () => new Tool(
            serviceProvider.resolve('toolsOptions'),
            serviceProvider.resolve('gitHub'),
            serviceProvider.resolve('fileSystem'),
            serviceProvider.resolve('toolsetVersions'),
            serviceProvider.resolve('httpClient'),
            serviceProvider.resolve('plantUmlOptions'),
            serviceProvider.resolve('shell')
        ));
    }

    export interface IOptions {
        serverPort: number;
    }

    export class Tool implements ITool {
        public constructor(
            private toolsOptions: IToolsOptions,
            private gitHub: IGitHub,
            private fileSystem: IFileSystem,
            private toolsetVersions: IToolsetVersions,
            private httpClient: IHttpClient,
            private options: IOptions,
            private shell: IShell
        ) {}

        async configure(): Promise<void | ConfigurationError> {
            const latestVersionDescriptor = await this.gitHub.getLatestRelease('plantuml', 'plantuml', /plantuml\.jar/);

            await this.fileSystem.createDirectory(this.toolsOptions.toolsDirectoryPath);

            const currentVersion = await this.toolsetVersions.getToolVersion(toolName);

            if (latestVersionDescriptor.name === currentVersion) {
                return;
            }

            await this.httpClient.downloadFile(latestVersionDescriptor.url, this.getJarPath());

            await this.toolsetVersions.setToolVersion(toolName, latestVersionDescriptor.name);
        }

        public runServer(): IServer {
            return new Server(this.shell, this.getJarPath(), this.options.serverPort);
        }

        getJarPath(): string {
            return this.fileSystem.clearPath(this.toolsOptions.toolsDirectoryPath, toolFileName)
        }
    }

    export interface IServer {
        start(): void;
        stop(): void;
        getSvg(code: string): Promise<string>;
    }

    export class Server implements IServer {
        private process: IProcess | null = null;

        constructor(
            private shell: IShell,
            private jarPath: string,
            private port: number) {}

        start() {
            this.process = this.shell.runProcess(`java -jar "${this.jarPath}" -picoweb:${this.port}`, );
        }

        stop() {
            this.process?.kill();
        }

        async getSvg(code: string): Promise<string> {
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