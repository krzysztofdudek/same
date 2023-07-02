#! /usr/bin/env node --no-warnings

const currentWorkingDirectory = "current working directory";

// general imports
import figlet from "figlet";
import { Command } from "commander";

// commands
import { exit } from "process";
import absoluteUnixPath from "./infrastructure/functions/absoluteUnixPath.js";
import { Bootstrapper } from "./bootstrapper.js";
import { InitializeCommand } from "./commands/initialize.js";
import { BuildCommand } from "./commands/build.js";
import { Logger } from "./infrastructure/logger.js";
import { FileSystem } from "./infrastructure/file-system.js";

const loggerOptions = Bootstrapper.serviceProvider.resolve<Logger.IOptions>(Logger.iOptionsServiceKey);
const fileSystem = Bootstrapper.serviceProvider.resolve<FileSystem.IFileSystem>(FileSystem.iFileSystemServiceKey);
const logger = Bootstrapper.serviceProvider
    .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
    .create("Host");

export const version = "1.0.0-alpha.7";

console.log(figlet.textSync(`SAME CLI`));

const program = new Command().version(version).description("Software Architecture Modeling Environment CLI");

program
    .command("initialize")
    .description("initializes repository")
    .option("--name <name>", "product name", "Your Product")
    .option("--working-directory <path>", "working directory path", `${currentWorkingDirectory}`)
    .option("--source-directory <name>", "source directory name", `src`)
    .option("--tools-directory <name>", "tools directory name", `_tools`)
    .option(
        "--minimal-log-level <level>",
        "minimal log level (Trace, Debug, Information, Warning, Error)",
        "Information"
    )
    .option("--log-format <format>", "format of logs (Compact, Extensive)", "Compact")
    .action((args) => {
        const workingDirectory = fileSystem.clearPath(
            args.workingDirectory.replace(currentWorkingDirectory, process.cwd())
        );

        loggerOptions.minimalLogLevel = args.minimalLogLevel;
        loggerOptions.logFormat = args.logFormat;

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
            .then(() => {
                exit(0);
            })
            .catch((error) => {
                logger.error(error);

                exit(1);
            });
    });

program
    .command("build")
    .description("builds html static files")
    .option("--host-name <name>", "host name", "localhost")
    .option("--host-port <port>", "host port", "8080")
    .option("--host-protocol <protocol>", "host protocol", "http")
    .option("--plant-uml-server-port <port>", "PlantUML server port", "65100")
    .option("--working-directory <path>", "working directory path", `${currentWorkingDirectory}`)
    .option("--source-directory <name>", "source directory name", `src`)
    .option("--tools-directory <name>", "tools directory name", `_tools`)
    .option("--output-directory <name>", "output directory name", `_build`)
    .option(
        "--minimal-log-level <level>",
        "minimal log level (Trace, Debug, Information, Warning, Error)",
        "Information"
    )
    .option("--log-format <format>", "format of logs (Compact, Extensive)", "Compact")
    .action((args) => {
        const workingDirectory = fileSystem.clearPath(
            args.workingDirectory.replace(currentWorkingDirectory, process.cwd())
        );

        loggerOptions.minimalLogLevel = args.minimalLogLevel;
        loggerOptions.logFormat = args.logFormat;

        const command = Bootstrapper.serviceProvider.resolve<BuildCommand.ICommand>(BuildCommand.iCommandServiceKey);

        command
            .execute({
                hostName: args.hostName,
                hostPort: args.hostPort,
                hostProtocol: args.hostProtocol,
                plantUmlServerPort: Number(args.plantUmlServerPort),
                workingDirectoryPath: absoluteUnixPath(workingDirectory),
                sourceDirectoryPath: absoluteUnixPath(workingDirectory, args.sourceDirectory),
                toolsDirectoryPath: absoluteUnixPath(workingDirectory, args.toolsDirectory),
                outputDirectoryPath: absoluteUnixPath(workingDirectory, args.outputDirectory),
            })
            .then(() => {
                exit(0);
            })
            .catch((error) => {
                logger.error(error);

                exit(1);
            });
    });

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
//     .option("--output-directory <name>", "output directory name", `_build`)
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
