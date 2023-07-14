import { Build } from "../core/build.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { Logger } from "../infrastructure/logger.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { PlantUml } from "../tools/plantuml.js";
import { Structurizr } from "../tools/structurizr.js";

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
                        .create("StructurizrBuild.FileBuilder")
                )
        );
    }

    export class FileDependencyIntrospector implements Build.IFileDependencyIntrospector {
        fileExtensions: string[] = ["dsl"];

        public constructor(private fileSystem: FileSystem.IFileSystem) {}

        async getDependencies(filePath: string, relativePath: string, fileContent: string): Promise<string[]> {
            const dependencies: string[] = [];

            const regex = /workspace\s*extends\s*(.*)\s*{/g;
            const matches = fileContent.matchAll(regex);

            let match: IteratorResult<RegExpMatchArray, any>;

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
            private logger: Logger.ILogger
        ) {}

        async build(context: Build.FileBuildContext): Promise<void> {
            const outputDirectoryPath = this.fileSystem.clearPath(
                this.buildOptions.outputDirectoryPath,
                context.relativePath
            );

            await this.fileSystem.delete(outputDirectoryPath);

            this.logger.trace("Rendering PlantUML diagrams with Structurizr CLI");

            await this.structurizrTool.generateDiagrams(context.path, outputDirectoryPath);

            const resultFiles = await this.fileSystem.getFilesRecursively(outputDirectoryPath);

            for (let i = 0; i < resultFiles.length; i++) {
                const filePath = resultFiles[i];
                const match = this.fileSystem.getName(filePath).match(/structurizr-(.*)\.puml/);
                const diagramName = match![1];

                const fileContent = await this.fileSystem.readFile(filePath);

                this.logger.debug(`Rendering diagram: ${diagramName}`);

                const svg = await this.plantUmlServer.getSvg(fileContent);

                const outputFilePath = this.fileSystem.clearPath(outputDirectoryPath, `${diagramName}.svg`);

                await this.fileSystem.createOrOverwriteFile(outputFilePath, svg);
                await this.fileSystem.delete(filePath);
            }
        }
    }
}
