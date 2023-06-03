import { PlantUml } from "../tools/plant-uml.js";
import { Structurizr } from "../tools/structurizr.js";
import express from 'express';
import { WebSocketServer } from 'ws';
import chalk from "chalk";
import fs from 'fs';
import path from 'path';
import { setTimeout } from "timers/promises";
import { Assets } from "../transformation/assets.js";
import { StructurizrTransformation } from "../transformation/structurizr.js";
import { MarkdownTransformation } from "../transformation/markdown.js";
import { ManifestFile } from "../core/manifest-file.js";
import { createDirectoryIfNotExists } from "../core/file-system.js";

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

let enforceReload = () => { };
let manifestFile: ManifestFile;
let plantUmlTool: PlantUml.Tool;
let structurizrTool: Structurizr.Tool;
let plantUmlServer: PlantUml.Server;

export async function exec(options: Options) {
    console.log(chalk.greenBright('Started serving.'));

    manifestFile = new ManifestFile(options.workingDirectoryPath);
    await manifestFile.load();

    structurizrTool = await Structurizr.configure(options.toolsDirectoryPath);

    try {
        plantUmlTool = await PlantUml.configure(options.toolsDirectoryPath);
        plantUmlServer = plantUmlTool.runServer(options.plantUmlServerPort);

        await createDirectoryIfNotExists(options.outputDirectoryPath);

        await Assets.saveJs(options.outputDirectoryPath);
        await Assets.saveCss(options.outputDirectoryPath);

        await StructurizrTransformation.transformAllFiles({
            workingDirectoryPath: options.sourceDirectoryPath,
            toolsDirectoryPath: options.toolsDirectoryPath,
            outputDirectoryPath: options.outputDirectoryPath
        }, structurizrTool);

        await MarkdownTransformation.transformAllFiles({
            hostName: options.hostName,
            hostPort: options.hostPort,
            hostProtocol: options.hostProtocol,
            workingDirectoryPath: options.sourceDirectoryPath,
            toolsDirectoryPath: options.toolsDirectoryPath,
            outputDirectoryPath: options.outputDirectoryPath,
            plantUmlToSvg: function (content) { return plantUmlServer.getSvg(content) },
            name: manifestFile.name
        });

        runDocumentationServer(options);
        runHotReload(options);
    } catch (error) {
        console.log(error);
    }
}

function runDocumentationServer(options: Options) {
    const app = express();

    app.use(express.static(options.outputDirectoryPath));

    const wsServer = new WebSocketServer({ noServer: true });

    const server = app.listen(options.hostPort, () => {
        console.log(`Documentation is being served on url: ${options.hostProtocol}://${options.hostName}:${options.hostPort}.`);
    });

    server.on('upgrade', (request, socket, head) => {
        wsServer.handleUpgrade(request, socket, head, socket => {
            wsServer.emit('connection', socket, request);
        })
    });

    enforceReload = function () {
        console.log(chalk.blueBright('Enforcing refresh.'));

        wsServer.clients.forEach(function each(client) {
            client.send('refresh');
        });
    };
}

function runHotReload(options: Options) {
    const changedFiles: string[] = [];

    fs.watch(path.join(options.sourceDirectoryPath), {
        recursive: true
    }, (eventType, fileName) => {
        if (!(typeof fileName === 'string')) {
            return;
        }

        if (eventType === 'change') {
            let filePath = path.join(options.sourceDirectoryPath, fileName);

            if (path.extname(filePath) !== '.dsl') {
                filePath = "any";
            }

            if (changedFiles.find(x => x === filePath)) {
                return;
            }

            changedFiles.push(filePath);
        }
    });

    new Promise(async () => {
        while (true) {
            if (changedFiles.length !== 0) {
                const file = changedFiles.pop();

                if (file === undefined) {
                    continue;
                }

                try {
                    if (path.extname(file) === '.dsl') {
                        StructurizrTransformation.transformSingleFile(file, options, structurizrTool);
                    }

                    await MarkdownTransformation.transformAllFiles({
                        hostName: options.hostName,
                        hostPort: options.hostPort,
                        hostProtocol: options.hostProtocol,
                        workingDirectoryPath: options.sourceDirectoryPath,
                        toolsDirectoryPath: options.toolsDirectoryPath,
                        outputDirectoryPath: options.outputDirectoryPath,
                        plantUmlToSvg: function (content) { return plantUmlServer.getSvg(content) },
                        name: manifestFile.name
                    });
                } catch (error) {
                    console.log(error);
                }

                enforceReload();
            }

            await setTimeout(5000);
        }
    });
}