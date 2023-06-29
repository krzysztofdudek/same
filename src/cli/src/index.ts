#! /usr/bin/env node --no-warnings

const currentWorkingDirectory = "current working directory";

// general imports
import figlet from "figlet";
import { Command } from "commander";

// commands
import { exit } from "process";
import path from "path";
import absoluteUnixPath from "./infrastructure/functions/absoluteUnixPath.js";
import { Bootstrapper } from "./bootstrapper.js";
import { InitializeCommand } from "./commands/initialize.js";

export const version = "1.0.0-alpha.7";

console.log(figlet.textSync(`SAME CLI`));

const program = new Command();

program.version(version).description("Software Architecture Modeling Environment CLI");

program
    .command("initialize")
    .description("initializes repository")
    .option("--name <name>", "product name", "Your Product")
    .option("--working-directory <path>", "working directory path", `${currentWorkingDirectory}`)
    .option("--source-directory <name>", "source directory name", `src`)
    .option("--tools-directory <name>", "tools directory name", `_tools`)
    .action((args) => {
        const workingDirectory = path.resolve(args.workingDirectory.replace(currentWorkingDirectory, process.cwd()));

        const command = Bootstrapper.serviceProvider.resolve<InitializeCommand.ICommand>(
            InitializeCommand.iCommandServiceKey
        );

        command
            .execute({
                name: args.name,
                workingDirectoryPath: absoluteUnixPath(workingDirectory),
                sourceDirectoryPath: absoluteUnixPath(workingDirectory, args.sourceDirectory),
                toolsDirectoryPath: absoluteUnixPath(workingDirectory, args.toolsDirectory),
            })
            .catch((error) => {
                console.log(error);
            })
            .finally(() => {
                exit();
            });
    });

// program
//     .command("build")
//     .description("builds documentation into html static files")
//     .option("--host-name <name>", "host name", "localhost")
//     .option("--host-port <port>", "host port", "8080")
//     .option("--host-protocol <protocol>", "host protocol", "http")
//     .option("--plant-uml-server-port <port>", "PlantUML server port", "65100")
//     .option("--working-directory <path>", "working directory path", `${currentWorkingDirectory}`)
//     .option("--source-directory <name>", "source directory name", `src`)
//     .option("--tools-directory <name>", "tools directory name", `_tools`)
//     .option("--output-directory <name>", "output directory name", `_generated`)
//     .action((args) => {
//         const workingDirectory = path.resolve(args.workingDirectory.replace(currentWorkingDirectory, process.cwd()));

//         execTransform({
//             hostName: args.hostName,
//             hostPort: args.hostPort,
//             hostProtocol: args.hostProtocol,
//             plantUmlServerPort: Number(args.plantUmlServerPort),
//             workingDirectoryPath: absoluteUnixPath(workingDirectory),
//             sourceDirectoryPath: absoluteUnixPath(workingDirectory, args.sourceDirectory),
//             toolsDirectoryPath: absoluteUnixPath(workingDirectory, args.toolsDirectory),
//             outputDirectoryPath: absoluteUnixPath(workingDirectory, args.outputDirectory),
//         })
//             .catch((error) => {
//                 console.log(error);
//             })
//             .finally(() => {
//                 exit();
//             });
//     });

// program
//     .command("serve")
//     .description("runs live server")
//     .option("--host-name <name>", "host name", "localhost")
//     .option("--host-port <port>", "host port", "8080")
//     .option("--host-protocol <protocol>", "host protocol", "http")
//     .option("--plant-uml-server-port <port>", "PlantUML server port", "65100")
//     .option("--working-directory <path>", "working directory path", `${currentWorkingDirectory}`)
//     .option("--source-directory <name>", "source directory name", `src`)
//     .option("--tools-directory <name>", "tools directory name", `_tools`)
//     .option("--output-directory <name>", "output directory name", `_generated`)
//     .action((args) => {
//         const workingDirectory = path.resolve(args.workingDirectory.replace(currentWorkingDirectory, process.cwd()));

//         execServe({
//             hostName: args.hostName,
//             hostPort: args.hostPort,
//             hostProtocol: args.hostProtocol,
//             plantUmlServerPort: Number(args.plantUmlServerPort),
//             workingDirectoryPath: absoluteUnixPath(workingDirectory),
//             sourceDirectoryPath: absoluteUnixPath(workingDirectory, args.sourceDirectory),
//             toolsDirectoryPath: absoluteUnixPath(workingDirectory, args.toolsDirectory),
//             outputDirectoryPath: absoluteUnixPath(workingDirectory, args.outputDirectory),
//         }).catch((error) => {
//             console.log(error);
//         });
//     });

program.parse();
