// import { Assets } from "../transformation/assets.js";
// import { PlantUml } from "../tools/plant-uml.js";
// import { Structurizr } from "../tools/structurizr.js";
// import chalk from "chalk";
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

// export async function exec(options: Options) {
//     await Itself.check();
//     await Java.check();
//     await Graphviz.check();

//     console.log(chalk.greenBright("Started transformation."));

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

//     console.log(chalk.greenBright("Transformation completed."));
// }
