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
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey)
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
            private fileSystem: FileSystem.IFileSystem
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

            this.plantUmlServer.start();

            try {
                await this.context.analyzeCompletely();
                await this.builder.build();
            } catch {
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
        }

        runHotReload() {
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

// import { PlantUml } from "../tools/plant-uml.js";
// import { Structurizr } from "../tools/structurizr.js";
// import express from "express";
// import { WebSocketServer } from "ws";
// import chalk from "chalk";
// import fs from "fs";
// import path from "path";
// import { setTimeout } from "timers/promises";
// import { Assets } from "../transformation/assets.js";
// import { StructurizrTransformation } from "../transformation/structurizr.js";
// import { MarkdownTransformation } from "../transformation/markdown.js";
// import { ManifestFile } from "../core/manifest.js";
// import { createDirectoryIfNotExists } from "../core/file-system.js";
// import { Itself } from "../tools/itself.js";
// import { Java } from "../tools/java.js";
// import { Graphviz } from "../tools/graphviz.js";

// export interface Options {
//     hostName: string;
//     hostPort: number;
//     hostProtocol: string;
//     plantUmlServerPort: number;
//     workingDirectoryPath: string;
//     sourceDirectoryPath: string;
//     outputDirectoryPath: string;
//     toolsDirectoryPath: string;
// }

// let enforceReload = () => {};
// let manifestFile: ManifestFile;
// let plantUmlTool: PlantUml.Tool;
// let structurizrTool: Structurizr.Tool;
// let plantUmlServer: PlantUml.Server;

// export async function exec(options: Options) {
//     await Itself.check();
//     await Java.check();
//     await Graphviz.check();

//     console.log(chalk.greenBright("Started serving"));

//     manifestFile = new ManifestFile(options.workingDirectoryPath);
//     await manifestFile.load();

//     structurizrTool = await Structurizr.configure(options.toolsDirectoryPath);

//     try {
//         plantUmlTool = await PlantUml.configure(options.toolsDirectoryPath);
//         plantUmlServer = plantUmlTool.runServer(options.plantUmlServerPort);

//         await createDirectoryIfNotExists(options.outputDirectoryPath);

//         await Assets.saveJs(options.outputDirectoryPath);
//         await Assets.saveCss(options.outputDirectoryPath);

//         await StructurizrTransformation.transformAllFiles(
//             {
//                 workingDirectoryPath: options.sourceDirectoryPath,
//                 toolsDirectoryPath: options.toolsDirectoryPath,
//                 outputDirectoryPath: options.outputDirectoryPath,
//             },
//             structurizrTool
//         );

//         await MarkdownTransformation.transformAllFiles({
//             hostName: options.hostName,
//             hostPort: options.hostPort,
//             hostProtocol: options.hostProtocol,
//             workingDirectoryPath: options.sourceDirectoryPath,
//             toolsDirectoryPath: options.toolsDirectoryPath,
//             outputDirectoryPath: options.outputDirectoryPath,
//             plantUmlToSvg: function (content) {
//                 return plantUmlServer.getSvg(content);
//             },
//             name: manifestFile.name,
//         });

//         runDocumentationServer(options);
//         runHotReload(options);
//     } catch (error) {
//         console.log(error);
//     }
// }

// function runDocumentationServer(options: Options) {
//     const app = express();

//     app.use(express.static(options.outputDirectoryPath));

//     const wsServer = new WebSocketServer({ noServer: true });

//     const server = app.listen(options.hostPort, () => {
//         console.log(
//             `Documentation is being served on url: ${options.hostProtocol}://${options.hostName}:${options.hostPort}.`
//         );
//     });

//     server.on("upgrade", (request, socket, head) => {
//         wsServer.handleUpgrade(request, socket, head, (socket) => {
//             wsServer.emit("connection", socket, request);
//         });
//     });

//     enforceReload = function () {
//         console.log(chalk.blueBright("Enforcing refresh"));

//         wsServer.clients.forEach(function each(client) {
//             client.send("refresh");
//         });
//     };
// }

// function runHotReload(options: Options) {
//     const changedFiles: { filePath: string; date: number }[] = [];

//     fs.watch(
//         path.join(options.sourceDirectoryPath),
//         {
//             recursive: true,
//         },
//         (eventType, fileName) => {
//             if (!(typeof fileName === "string")) {
//                 return;
//             }

//             if (eventType === "change") {
//                 let filePath = path.join(options.sourceDirectoryPath, fileName);
//                 filePath = path.resolve(filePath)?.replaceAll(/\\/g, "/");

//                 const changedFile = changedFiles.find((x) => x.filePath === filePath);

//                 if (changedFile === undefined) {
//                     changedFiles.push({ filePath: filePath, date: Date.now() });
//                 } else if (changedFile.date === 0) {
//                     changedFile.date = Date.now();
//                 }
//             }
//         }
//     );

//     new Promise(async () => {
//         const markdownOptions: MarkdownTransformation.Options = {
//             hostName: options.hostName,
//             hostPort: options.hostPort,
//             hostProtocol: options.hostProtocol,
//             workingDirectoryPath: options.sourceDirectoryPath,
//             toolsDirectoryPath: options.toolsDirectoryPath,
//             outputDirectoryPath: options.outputDirectoryPath,
//             plantUmlToSvg: function (content: string) {
//                 return plantUmlServer.getSvg(content);
//             },
//             name: manifestFile.name,
//         };

//         while (true) {
//             const changedFile = changedFiles.find((x) => x.date !== 0 && x.date + 1000 * 5 < Date.now());

//             if (changedFile) {
//                 changedFile.date = 0;

//                 try {
//                     const extension = path.extname(changedFile.filePath);

//                     if (extension === ".dsl") {
//                         await StructurizrTransformation.transformSingleFile(
//                             changedFile.filePath,
//                             {
//                                 outputDirectoryPath: options.outputDirectoryPath,
//                                 toolsDirectoryPath: options.toolsDirectoryPath,
//                                 workingDirectoryPath: options.sourceDirectoryPath,
//                             },
//                             structurizrTool
//                         );

//                         await MarkdownTransformation.transformAllFilesRelatedToSpecified(
//                             changedFile.filePath,
//                             markdownOptions
//                         );
//                     } else if (extension === ".md") {
//                         await MarkdownTransformation.transformSingleFile(changedFile.filePath, markdownOptions);

//                         await MarkdownTransformation.transformAllFilesRelatedToSpecified(
//                             changedFile.filePath,
//                             markdownOptions
//                         );
//                     } else {
//                         await MarkdownTransformation.transformAllFilesRelatedToSpecified(
//                             changedFile.filePath,
//                             markdownOptions
//                         );
//                     }
//                 } catch (error) {
//                     console.log(error);
//                 }

//                 enforceReload();
//             }

//             await setTimeout(100);
//         }
//     });
// }
