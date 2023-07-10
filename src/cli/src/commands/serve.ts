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
                        .create(iCommandServiceKey)
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
            private logger: Logger.ILogger
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

            try {
                await this.toolset.configure();
            } catch {
                return;
            }

            await this.plantUmlServer.start();

            try {
                await this.context.analyzeCompletely();
                await this.builder.build();
            } catch (error) {
                this.logger.error(error);

                this.plantUmlServer.stop();

                return;
            }

            this.runServer();
            this.runHotReload();
        }

        private enforceReload = () => {};

        private runServer() {
            const app = express();

            app.use(express.static(this.publishOptions.outputDirectoryPath));
            app.use(swagger.serve);

            const wsServer = new WebSocketServer({ noServer: true });

            const server = app.listen(this.publishOptions.hostPort, () => {
                console.log(
                    `Server run on url: ${this.publishOptions.hostProtocol}://${this.publishOptions.hostName}:${this.publishOptions.hostPort}.`
                );
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
            this.fileSystem.watchRecursive(this.buildOptions.sourceDirectoryPath, async (filePath) => {
                try {
                    await this.context.analyze(filePath);
                    await this.builder.build();
                } catch {}

                this.enforceReload();
            });
        }
    }
}
