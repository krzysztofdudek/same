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
import { PublishCommand } from "./commands/publish.js";
import { Logger } from "./infrastructure/logger.js";
import { FileSystem } from "./infrastructure/file-system.js";
import { ServeCommand } from "./commands/serve.js";

const loggerOptions = Bootstrapper.serviceProvider.resolve<Logger.IOptions>(Logger.iOptionsServiceKey);
const fileSystem = Bootstrapper.serviceProvider.resolve<FileSystem.IFileSystem>(FileSystem.iFileSystemServiceKey);
const logger = Bootstrapper.serviceProvider
    .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
    .create("Host");

export const version = "1.0.0-alpha.15";

console.log(figlet.textSync(`SAME CLI`));

const program = new Command().version(version).description("Software Architecture Modeling Environment CLI");

program
    .command("initialize")
    .description("initializes repository")
    .requiredOption("--name <name>", "product name", "Your Product")
    .requiredOption("--working-directory <path>", "working directory path", `${currentWorkingDirectory}`)
    .requiredOption("--source-directory <name>", "source directory name", `src`)
    .requiredOption("--tools-directory <name>", "tools directory name", `_tools`)
    .requiredOption(
        "--minimal-log-level <level>",
        "minimal log level (Trace, Debug, Information, Warning, Error)",
        "Information"
    )
    .requiredOption("--log-format <format>", "format of logs (Compact, Extensive)", "Compact")
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
    .command("publish")
    .description("prepares artifacts to be published")
    .requiredOption("--output-type <type>", "artifacts output type (html)", "html")
    .requiredOption("--host-name <name>", "host name", "localhost")
    .requiredOption("--host-port <port>", "host port", "8080")
    .requiredOption("--host-protocol <protocol>", "host protocol", "http")
    .requiredOption("--plant-uml-server-port <port>", "PlantUML server port", "65100")
    .requiredOption("--working-directory <path>", "working directory path", `${currentWorkingDirectory}`)
    .requiredOption("--source-directory <name>", "a directory where source files lays", `src`)
    .requiredOption("--tools-directory <name>", "a directory destined for tools setup", `_tools`)
    .requiredOption("--build-directory <name>", "a directory for storage of build artifacts", `_build`)
    .requiredOption("--publish-directory <name>", "a directory where publish artifacts are stored", `_publish`)
    .requiredOption(
        "--minimal-log-level <level>",
        "minimal log level (Trace, Debug, Information, Warning, Error)",
        "Information"
    )
    .requiredOption("--log-format <format>", "format of logs (Compact, Extensive)", "Compact")
    .option("--skip-tools-check", "skips tools check performed at the beginning")
    .action((args) => {
        const workingDirectory = fileSystem.clearPath(
            args.workingDirectory.replace(currentWorkingDirectory, process.cwd())
        );

        loggerOptions.minimalLogLevel = args.minimalLogLevel;
        loggerOptions.logFormat = args.logFormat;

        const command = Bootstrapper.serviceProvider.resolve<PublishCommand.ICommand>(
            PublishCommand.iCommandServiceKey
        );

        command
            .execute({
                outputType: args.outputType,
                hostName: args.hostName,
                hostPort: args.hostPort,
                hostProtocol: args.hostProtocol,
                plantUmlServerPort: Number(args.plantUmlServerPort),
                workingDirectoryPath: absoluteUnixPath(workingDirectory),
                sourceDirectoryPath: absoluteUnixPath(workingDirectory, args.sourceDirectory),
                toolsDirectoryPath: absoluteUnixPath(workingDirectory, args.toolsDirectory),
                buildDirectoryPath: absoluteUnixPath(workingDirectory, args.buildDirectory),
                publishDirectoryPath: absoluteUnixPath(workingDirectory, args.publishDirectory),
                skipToolsCheck: args.skipToolsCheck !== undefined,
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
    .command("serve")
    .description("serves documentation with live reload ability")
    .requiredOption("--output-type <type>", "artifacts output type (html)", "html")
    .requiredOption("--server-port <port>", "port on which server is going to be run", "8080")
    .requiredOption("--host-name <name>", "public interface host name", "localhost")
    .requiredOption("--host-port <port>", "public interface host port", "8080")
    .requiredOption("--host-protocol <protocol>", "public interface host protocol", "http")
    .requiredOption("--plant-uml-server-port <port>", "PlantUML server port", "65100")
    .requiredOption("--working-directory <path>", "working directory path", `${currentWorkingDirectory}`)
    .requiredOption("--source-directory <name>", "a directory where source files lays", `src`)
    .requiredOption("--tools-directory <name>", "a directory destined for tools setup", `_tools`)
    .requiredOption("--build-directory <name>", "a directory for storage of build artifacts", `_build`)
    .requiredOption("--publish-directory <name>", "a directory where publish artifacts are stored", `_publish`)
    .requiredOption(
        "--minimal-log-level <level>",
        "minimal log level (Trace, Debug, Information, Warning, Error)",
        "Information"
    )
    .requiredOption("--log-format <format>", "format of logs (Compact, Extensive)", "Compact")
    .option("--skip-tools-check", "skips tools check performed at the beginning")
    .requiredOption("--watch", "should server be watching source files (yes / no)", "yes")
    .action((args) => {
        const workingDirectory = fileSystem.clearPath(
            args.workingDirectory.replace(currentWorkingDirectory, process.cwd())
        );

        loggerOptions.minimalLogLevel = args.minimalLogLevel;
        loggerOptions.logFormat = args.logFormat;

        const command = Bootstrapper.serviceProvider.resolve<ServeCommand.ICommand>(ServeCommand.iCommandServiceKey);

        command
            .execute({
                outputType: args.outputType,
                serverPort: args.serverPort,
                hostName: args.hostName,
                hostPort: args.hostPort,
                hostProtocol: args.hostProtocol,
                plantUmlServerPort: Number(args.plantUmlServerPort),
                workingDirectoryPath: absoluteUnixPath(workingDirectory),
                sourceDirectoryPath: absoluteUnixPath(workingDirectory, args.sourceDirectory),
                toolsDirectoryPath: absoluteUnixPath(workingDirectory, args.toolsDirectory),
                buildDirectoryPath: absoluteUnixPath(workingDirectory, args.buildDirectory),
                publishDirectoryPath: absoluteUnixPath(workingDirectory, args.publishDirectory),
                skipToolsCheck: args.skipToolsCheck !== undefined,
                watch: args.watch === "yes",
            })
            .catch((error) => {
                logger.error(error);

                exit(1);
            });
    });

program.parse();
