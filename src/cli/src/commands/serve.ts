import { ServiceProvider } from "../infrastructure/service-provider.js";
import { ICommand as ICommandCore } from "../core/command.js";
import { Manifest } from "../core/manifest.js";
import { Toolset } from "../core/toolset.js";
import { Build } from "../core/build.js";
import { PlantUml } from "../tools/plant-uml.js";
import { Publish } from "../publish/publish-static-files.js";
import express from "express";
import { WebSocketServer } from "ws";
import { FileSystem } from "../infrastructure/file-system.js";
import { Logger } from "../infrastructure/logger.js";
import swagger from "swagger-ui-express";
import { exit } from "process";
import { Awaiter } from "../infrastructure/awaiter.js";

export namespace ServeCommand {
    export const iCommandServiceKey = "ServeCommand.ICommand";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iCommandServiceKey,
            () =>
                new Command(
                    serviceProvider.resolve(Manifest.iOptionsServiceKey),
                    serviceProvider.resolve(Toolset.iOptionsServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey),
                    serviceProvider.resolve(PlantUml.iOptionsServiceKey),
                    serviceProvider.resolve(Toolset.iToolsetServiceKey),
                    serviceProvider.resolve(PlantUml.iServerServiceKey),
                    serviceProvider.resolve(Build.iBuilderServiceKey),
                    serviceProvider.resolve(Build.iContextServiceKey),
                    serviceProvider.resolve(Publish.iOptionsServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create(iCommandServiceKey),
                    serviceProvider.resolve(Awaiter.iAwaiterServiceKey)
                )
        );
    }

    export interface IOptions {
        outputType: string;
        hostName: string;
        hostPort: number;
        hostProtocol: string;
        plantUmlServerPort: number;
        workingDirectoryPath: string;
        sourceDirectoryPath: string;
        buildDirectoryPath: string;
        toolsDirectoryPath: string;
        publishDirectoryPath: string;
        skipToolsCheck: boolean;
        watch: boolean;
    }

    export interface ICommand extends ICommandCore<IOptions> {}

    export class Command implements ICommand {
        public constructor(
            private manifestOptions: Manifest.IOptions,
            private toolsOptions: Toolset.IOptions,
            private buildOptions: Build.IOptions,
            private plantUmlOptions: PlantUml.IOptions,
            private toolset: Toolset.IToolset,
            private plantUmlServer: PlantUml.IServer,
            private builder: Build.IBuilder,
            private context: Build.IContext,
            private publishOptions: Publish.IOptions,
            private fileSystem: FileSystem.IFileSystem,
            private logger: Logger.ILogger,
            private awaiter: Awaiter.IAwaiter
        ) {}

        async execute(options: IOptions): Promise<void> {
            this.manifestOptions.workingDirectory = options.workingDirectoryPath;

            this.toolsOptions.toolsDirectoryPath = options.toolsDirectoryPath;

            this.buildOptions.sourceDirectoryPath = options.sourceDirectoryPath;
            this.buildOptions.outputDirectoryPath = options.buildDirectoryPath;
            this.buildOptions.outputType = options.outputType;

            this.publishOptions.outputDirectoryPath = options.publishDirectoryPath;
            this.publishOptions.hostProtocol = options.hostProtocol;
            this.publishOptions.hostName = options.hostName;
            this.publishOptions.hostPort = options.hostPort;

            this.plantUmlOptions.serverPort = options.plantUmlServerPort;

            if (!options.skipToolsCheck) {
                try {
                    await this.toolset.configure();
                } catch {
                    return;
                }
            }

            await this.plantUmlServer.start();

            try {
                await this.context.analyzeCompletely();
                await this.builder.build();
            } catch (error) {
                this.logger.error(error);

                this.plantUmlServer.stop();

                exit(1);
                return;
            }

            this.runServer();

            if (options.watch) {
                this.runHotReload();
            }
        }

        private enforceReload = () => {};

        private runServer() {
            const app = express();

            app.use(swagger.serve);
            app.use(express.static(this.publishOptions.outputDirectoryPath));

            const wsServer = new WebSocketServer({ noServer: true });

            const server = app.listen(this.publishOptions.hostPort, () => {
                console.log(`Server run on url: ${this.publishOptions.createBaseUrl()}.`);
            });

            server.on("upgrade", (request, socket, head) => {
                wsServer.handleUpgrade(request, socket, head, (socket) => {
                    wsServer.emit("connection", socket, request);
                });
            });

            this.enforceReload = function () {
                wsServer.clients.forEach(function each(client) {
                    client.send("refresh");
                });
            };

            process.on("SIGINT", () => {
                wsServer.close();
                server.close();

                exit(0);
            });
        }

        private runHotReload() {
            let updatedFilesPaths: string[] = [];

            this.fileSystem.watchRecursive(this.buildOptions.sourceDirectoryPath, async (filePath) => {
                if (updatedFilesPaths.indexOf(filePath) !== -1) {
                    return;
                }

                updatedFilesPaths.push(filePath);
            });

            new Promise(async () => {
                while (true) {
                    if (updatedFilesPaths.length > 0) {
                        const filesPaths = [...updatedFilesPaths];

                        for (let i = 0; i < filesPaths.length; i++) {
                            const filePath = filesPaths[i];

                            try {
                                await this.context.analyze(filePath);
                            } catch {}

                            updatedFilesPaths = updatedFilesPaths.filter((x) => filesPaths.indexOf(x) === -1);
                        }

                        await this.builder.build();
                        this.enforceReload();
                    }

                    await this.awaiter.wait(500);
                }
            });
        }
    }
}
