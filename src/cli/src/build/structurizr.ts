import { Build } from "../core/build.js";
import { matchAll } from "../core/regExp.js";
import { Awaiter } from "../infrastructure/awaiter.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { Logger } from "../infrastructure/logger.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { PlantUml } from "../tools/plant-uml.js";
import { Structurizr } from "../tools/structurizr.js";
import { PlantUmlBuild } from "./plant-uml.js";

const templateBeginRegexp = /\s*\/\/\s*@template-begin\s*/gm;
const templateRenderRegexp = /\/\/\s*@render\s*[^\n]+/gm;
const renderParametersRegexp = /(\w+)\s*=\s*\"([^"]*)\"/gm;
const templateBodyRegexp = /\/\/\s*@template-body\n/m;
const templateEndRegexp = /\/\/\s*@template-end/m;

export namespace StructurizrBuild {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileDependencyIntrospector(
            serviceProvider,
            () => new FileDependencyIntrospector(serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );

        Build.registerFileBuilder(
            serviceProvider,
            () =>
                new FileBuilder(
                    serviceProvider.resolve(Structurizr.toolServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(PlantUml.iServerServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create("StructurizrBuild.FileBuilder"),
                    serviceProvider.resolve(PlantUmlBuild.linkTransformerServiceKey),
                    serviceProvider.resolve(Awaiter.iAwaiterServiceKey)
                )
        );
    }

    export class FileDependencyIntrospector implements Build.IFileDependencyIntrospector {
        fileExtensions: string[] = ["dsl"];

        public constructor(private fileSystem: FileSystem.IFileSystem) {}

        async getDependencies(filePath: string, relativePath: string, fileContent: string): Promise<string[]> {
            const dependencies: string[] = [];

            let regex = /workspace\s*extends\s*(.*)\s*{/g;
            let matches = fileContent.matchAll(regex);
            let match: IteratorResult<RegExpMatchArray, any>;

            while ((match = matches.next()).done !== true) {
                const path = this.fileSystem.clearPath(this.fileSystem.getDirectory(filePath), match.value[1].trim());

                if (dependencies.indexOf(path) !== -1) {
                    continue;
                }

                dependencies.push(path);
            }

            regex = /!include\s*([^\n]+)/g;
            matches = fileContent.matchAll(regex);

            while ((match = matches.next()).done !== true) {
                const path = this.fileSystem.clearPath(this.fileSystem.getDirectory(filePath), match.value[1].trim());

                if (dependencies.indexOf(path) !== -1) {
                    continue;
                }

                dependencies.push(path);
            }

            return dependencies;
        }
    }

    export class FileBuilder implements Build.IFileBuilder {
        fileExtensions: string[] = ["dsl"];
        outputType = "html";

        public constructor(
            private structurizrTool: Structurizr.ITool,
            private buildOptions: Build.IOptions,
            private fileSystem: FileSystem.IFileSystem,
            private plantUmlServer: PlantUml.IServer,
            private logger: Logger.ILogger,
            private linkTransformer: PlantUmlBuild.LinkTransformer,
            private awaiter: Awaiter.IAwaiter
        ) {}

        async build(context: Build.FileBuildContext): Promise<void> {
            let dslFileContent = await this.fileSystem.readFile(context.path);

            if (dslFileContent.startsWith("//ignore")) {
                const dslFilePath = this.fileSystem.clearPath(
                    this.buildOptions.outputDirectoryPath,
                    context.relativePath
                );

                await this.fileSystem.createDirectory(this.fileSystem.getDirectory(dslFilePath));

                await this.fileSystem.copy(context.path, dslFilePath);

                return;
            }

            const outputDirectoryPath = this.fileSystem.clearPath(
                this.buildOptions.outputDirectoryPath,
                context.relativePath + "_processed"
            );

            await this.fileSystem.delete(outputDirectoryPath);

            this.logger.trace("Rendering PlantUML diagrams with Structurizr CLI");

            dslFileContent = this.transformTemplates(dslFileContent);
            const dslFilePath = this.fileSystem.clearPath(this.buildOptions.outputDirectoryPath, context.relativePath);
            await this.fileSystem.createDirectory(this.fileSystem.getDirectory(dslFilePath));
            await this.fileSystem.createOrOverwriteFile(dslFilePath, dslFileContent);

            await this.structurizrTool.generateDiagrams(dslFilePath, outputDirectoryPath);

            const resultFiles = await this.fileSystem.getFilesRecursively(outputDirectoryPath);

            for (let i = 0; i < resultFiles.length; i++) {
                const filePath = resultFiles[i];
                const match = this.fileSystem.getName(filePath).match(/structurizr-(.*)\.puml/);
                const diagramName = match![1];

                let fileContent = await this.fileSystem.readFile(filePath);

                fileContent = await this.linkTransformer.transformLinks(context, fileContent);

                this.logger.debug(`Rendering diagram: ${diagramName}`);

                let svg: string = "";

                while (true) {
                    try {
                        svg = await this.plantUmlServer.getSvg(fileContent);

                        break;
                    } catch (error) {
                        this.logger.warn(`While rendering ${diagramName} error occur: ${error}`);

                        await this.awaiter.wait(200);
                    }
                }

                const outputFilePath = this.fileSystem.clearPath(outputDirectoryPath, `${diagramName}.svg`);

                await this.fileSystem.createOrOverwriteFile(outputFilePath, svg);
                await this.fileSystem.delete(filePath);
            }
        }

        transformTemplates(fileContent: string): string {
            const fragments: string[] = [];
            const templateStartMatches = matchAll(fileContent, templateBeginRegexp);
            let lastIndex = 0;

            for (let i = 0; i < templateStartMatches.length; i++) {
                const templateStartMatch = templateStartMatches[i];
                const startIndex = templateStartMatch.index!;
                const fragment = fileContent.substring(startIndex);

                fragments.push(fileContent.substring(lastIndex, startIndex));

                const templateBodyMatch = fragment.match(templateBodyRegexp);
                if (!templateBodyMatch) {
                    throw new Error("Template has no body tag");
                }
                const bodyIndex = startIndex + templateBodyMatch.index! + templateBodyMatch[0].length;

                const templateEndMatch = fragment.match(templateEndRegexp);
                if (!templateEndMatch) {
                    throw new Error("Template has no end tag.");
                }
                const endIndex = startIndex + templateEndMatch.index!;
                lastIndex = endIndex + templateEndMatch[0].length;

                const headerFragment = fileContent.substring(startIndex, bodyIndex);
                const bodyFragment = fileContent.substring(bodyIndex, endIndex);

                matchAll(headerFragment, templateRenderRegexp).forEach((templateRenderMatch) => {
                    let newFragment = bodyFragment;

                    matchAll(templateRenderMatch[0], renderParametersRegexp).forEach((renderParameterMatch) => {
                        const parameterName = renderParameterMatch[1];
                        const parameterValue = renderParameterMatch[2];

                        newFragment = newFragment.replaceAll(`__${parameterName}__`, parameterValue);

                        newFragment = newFragment.replaceAll(
                            new RegExp(`!constant\\s*${parameterName}\\s*[^\\n]+`, "gm"),
                            `!constant ${parameterName} ${parameterValue}`
                        );
                    });

                    fragments.push(newFragment);
                });
            }

            fragments.push(fileContent.substring(lastIndex));

            return fragments.join("\n");
        }
    }
}
