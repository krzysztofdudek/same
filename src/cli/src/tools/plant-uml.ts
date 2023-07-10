import { GitHub } from "../core/github.js";
import { Toolset } from "../core/toolset.js";
import { encode64, zip_deflate } from "../core/deflate.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { HttpClient } from "../infrastructure/http-client.js";
import { Shell } from "../infrastructure/shell.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { Logger } from "../infrastructure/logger.js";
import { Awaiter } from "../infrastructure/awaiter.js";

const toolName = "PlantUml";
const toolFileName = "plantuml.jar";

export namespace PlantUml {
    export const iToolServiceKey = "PlantUml.ITool";
    export const iServerServiceKey = "PlantUml.IServer";
    export const iOptionsServiceKey = "PlantUml.IOptions";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iOptionsServiceKey,
            () =>
                <IOptions>{
                    serverPort: 10000,
                }
        );

        serviceProvider.registerSingletonMany(
            [Toolset.iToolServiceKey, iToolServiceKey],
            () =>
                new Tool(
                    serviceProvider.resolve(Toolset.iOptionsServiceKey),
                    serviceProvider.resolve(GitHub.iGitHubServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(Toolset.iToolsetVersionsServiceKey),
                    serviceProvider.resolve(HttpClient.iHttpClientServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create(iToolServiceKey)
                )
        );

        serviceProvider.registerSingleton(
            iServerServiceKey,
            () =>
                new Server(
                    serviceProvider.resolve(Shell.iShellServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create(iServerServiceKey),
                    serviceProvider.resolve(iToolServiceKey),
                    serviceProvider.resolve(iOptionsServiceKey),
                    serviceProvider.resolve(Awaiter.iAwaiterServiceKey)
                )
        );
    }

    export interface IOptions {
        serverPort: number;
    }

    export interface ITool extends Toolset.ITool {
        getJarPath(): string;
    }

    export class Tool implements ITool {
        public constructor(
            private toolsOptions: Toolset.IOptions,
            private gitHub: GitHub.IGitHub,
            private fileSystem: FileSystem.IFileSystem,
            private toolsetVersions: Toolset.IToolsetVersions,
            private httpClient: HttpClient.IHttpClient,
            private logger: Logger.ILogger
        ) {}

        async configure(): Promise<void> {
            const latestVersionDescriptor = await this.gitHub.getLatestRelease("plantuml", "plantuml", /plantuml\.jar/);

            const currentVersion = await this.toolsetVersions.getToolVersion(toolName);

            if (latestVersionDescriptor.name === currentVersion) {
                this.logger.debug("PlantUML is up to date");

                return;
            }

            this.logger.debug("Downloading binaries");
            await this.httpClient.downloadFile(latestVersionDescriptor.url, this.getJarPath());
            this.logger.debug("Ready");

            await this.toolsetVersions.setToolVersion(toolName, latestVersionDescriptor.name);
        }

        public getJarPath(): string {
            return this.fileSystem.clearPath(this.toolsOptions.toolsDirectoryPath, toolFileName);
        }
    }

    export interface IServer {
        start(): Promise<void>;
        stop(): void;
        getSvg(code: string): Promise<string>;
    }

    export class Server implements IServer {
        private process: Shell.IProcess | null = null;

        constructor(
            private shell: Shell.IShell,
            private logger: Logger.ILogger,
            private tool: ITool,
            private options: IOptions,
            private awaiter: Awaiter.IAwaiter
        ) {}

        async start() {
            this.logger.debug("Starting PlantUML server");

            this.process = this.shell.runProcess(
                `java -jar "${this.tool.getJarPath()}" -picoweb:${this.options.serverPort}`
            );

            let response: Response | undefined;

            do {
                try {
                    response = await fetch(`http://localhost:${this.options.serverPort}/plantuml`);

                    return;
                } catch (error) {}

                this.logger.debug("Waiting for PlantUML server startup...");

                await this.awaiter.wait(1000);
            } while (response?.status !== 200);
        }

        stop() {
            this.logger.debug("Stopping PlantUML server");

            this.process?.kill();
        }

        async getSvg(code: string): Promise<string> {
            const zippedCode = encode64(zip_deflate(unescape(encodeURIComponent(code)), 9));

            const response = await fetch(`http://localhost:${this.options.serverPort}/plantuml/svg/${zippedCode}`);

            return await response.text();
        }
    }
}
