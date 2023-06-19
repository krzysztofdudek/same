#! /usr/bin/env node --no-warnings

const currentWorkingDirectory = "current working directory";

// general imports
import figlet from 'figlet';
import { Command } from 'commander';

// commands
import { exec as execInitialize } from './commands/initialize.js';
import { exec as execTransform } from './commands/transform.js';
import { exec as execServe } from './commands/serve.js';
import { exit } from 'process';
import path from 'path';

export const version = '1.0.0-alpha.7';

console.log(figlet.textSync(`SAME CLI`));

const program = new Command();

program.version(version)
    .description('Software Architecture Modeling Environment CLI');

program.command('initialize')
    .description("initializes repository")
    .option('--name <name>', 'product name', "Your Product")
    .option('--working-directory <path>', 'working directory path', `${currentWorkingDirectory}`)
    .option('--source-directory <name>', 'source directory name', `src`)
    .option('--tools-directory <name>', 'tools directory name', `_tools`)
    .action(args => {
        const workingDirectory = path.resolve(args.workingDirectory.replace(currentWorkingDirectory, process.cwd()));

        execInitialize({
            name: args.name,
            workingDirectoryPath: workingDirectory.replaceAll(/\\/g, '/'),
            sourceDirectoryPath: path.join(workingDirectory, args.sourceDirectory).replaceAll(/\\/g, '/'),
            toolsDirectoryPath: path.join(workingDirectory, args.toolsDirectory).replaceAll(/\\/g, '/'),
        })
            .catch(error => {
                console.log(error);
            })
            .finally(() => {
                exit();
            });
    });

program.command('transform')
    .description('transforms files')
    .option('--host-name <name>', 'host name', 'localhost')
    .option('--host-port <port>', 'host port', '8080')
    .option('--host-protocol <protocol>', 'host protocol', 'http')
    .option('--plant-uml-server-port <port>', 'PlantUML server port', '65100')
    .option('--working-directory <path>', 'working directory path', `${currentWorkingDirectory}`)
    .option('--source-directory <name>', 'source directory name', `src`)
    .option('--tools-directory <name>', 'tools directory name', `_tools`)
    .option('--output-directory <name>', 'output directory name', `_generated`)
    .action(args => {
        const workingDirectory = path.resolve(args.workingDirectory.replace(currentWorkingDirectory, process.cwd()));

        execTransform({
            hostName: args.hostName,
            hostPort: args.hostPort,
            hostProtocol: args.hostProtocol,
            plantUmlServerPort: Number(args.plantUmlServerPort),
            workingDirectoryPath: workingDirectory.replaceAll(/\\/g, '/'),
            sourceDirectoryPath: path.join(workingDirectory, args.sourceDirectory).replaceAll(/\\/g, '/'),
            toolsDirectoryPath: path.join(workingDirectory, args.toolsDirectory).replaceAll(/\\/g, '/'),
            outputDirectoryPath: path.join(workingDirectory, args.outputDirectory).replaceAll(/\\/g, '/')
        })
            .catch(error => {
                console.log(error);
            })
            .finally(() => {
                exit();
            });
    });

program.command('serve')
    .description('runs live server')
    .option('--host-name <name>', 'host name', 'localhost')
    .option('--host-port <port>', 'host port', '8080')
    .option('--host-protocol <protocol>', 'host protocol', 'http')
    .option('--plant-uml-server-port <port>', 'PlantUML server port', '65100')
    .option('--working-directory <path>', 'working directory path', `${currentWorkingDirectory}`)
    .option('--source-directory <name>', 'source directory name', `src`)
    .option('--tools-directory <name>', 'tools directory name', `_tools`)
    .option('--output-directory <name>', 'output directory name', `_generated`)
    .action(args => {
        const workingDirectory = path.resolve(args.workingDirectory.replace(currentWorkingDirectory, process.cwd()));

        execServe({
            hostName: args.hostName,
            hostPort: args.hostPort,
            hostProtocol: args.hostProtocol,
            plantUmlServerPort: Number(args.plantUmlServerPort),
            workingDirectoryPath: workingDirectory.replaceAll(/\\/g, '/'),
            sourceDirectoryPath: path.join(workingDirectory, args.sourceDirectory).replaceAll(/\\/g, '/'),
            toolsDirectoryPath: path.join(workingDirectory, args.toolsDirectory).replaceAll(/\\/g, '/'),
            outputDirectoryPath: path.join(workingDirectory, args.outputDirectory).replaceAll(/\\/g, '/')
        })
            .catch(error => {
                console.log(error);
            });
    });

program.parse();