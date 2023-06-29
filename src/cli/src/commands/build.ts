import { ServiceProvider } from "../infrastructure/service-provider.js";
import { ICommand as ICommandCore } from "../core/command.js";

export interface Options {
    hostName: string;
    hostPort: number;
    hostProtocol: string;
    plantUmlServerPort: number;
    workingDirectoryPath: string;
    sourceDirectoryPath: string;
    outputDirectoryPath: string;
    toolsDirectoryPath: string;
}

export namespace BuildCommand {
    export const iCommandServiceKey = "BuildCommand.ICommand";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {}

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
        async execute(options: IOptions): Promise<void> {}
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
