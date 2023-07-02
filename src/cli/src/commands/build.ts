import { ServiceProvider } from "../infrastructure/service-provider.js";
import { ICommand as ICommandCore } from "../core/command.js";
import { Manifest } from "../core/manifest.js";
import { Toolset } from "../core/toolset.js";
import { Build } from "../core/build.js";
import { PlantUml } from "../tools/plant-uml.js";

export namespace BuildCommand {
    export const iCommandServiceKey = "BuildCommand.ICommand";

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
                    serviceProvider.resolve(Build.iBuilderServiceKey)
                )
        );
    }

    export interface IOptions {
        hostName: string;
        hostPort: number;
        hostProtocol: string;
        plantUmlServerPort: number;
        workingDirectoryPath: string;
        sourceDirectoryPath: string;
        outputDirectoryPath: string;
        toolsDirectoryPath: string;
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
            private builder: Build.IBuilder
        ) {}

        async execute(options: IOptions): Promise<void> {
            this.manifestOptions.workingDirectory = options.workingDirectoryPath;
            this.toolsOptions.toolsDirectoryPath = options.toolsDirectoryPath;
            this.buildOptions.sourceDirectoryPath = options.sourceDirectoryPath;
            this.buildOptions.outputDirectoryPath = options.outputDirectoryPath;
            this.plantUmlOptions.serverPort = options.plantUmlServerPort;

            try {
                await this.toolset.configure();
            } catch {
                return;
            }

            this.plantUmlServer.start();

            try {
                await this.builder.buildAll();
            } finally {
                this.plantUmlServer.stop();
            }
        }
    }
}

// export async function exec(options: Options) {
//     await Itself.check();
//     await Java.check();
//     await Graphviz.check();

//     console.log(chalk.greenBright("Started transformation"));

//     const manifestFile = new ManifestFile(options.workingDirectoryPath);
//     await manifestFile.load();

//     const structurizrTool = await Structurizr.configure(options.toolsDirectoryPath);
//     let plantUmlServer: PlantUml.Server | undefined;

//     try {
//         const plantUmlTool = await PlantUml.configure(options.toolsDirectoryPath);
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
//                 return plantUmlServer!.getSvg(content);
//             },
//             name: manifestFile.name,
//         });
//     } catch (error) {
//         console.log(error);
//     } finally {
//         plantUmlServer?.kill();
//     }

//     console.log(chalk.greenBright("Transformation completed"));
// }
