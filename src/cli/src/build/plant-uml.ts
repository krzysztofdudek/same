import { Build } from "../core/build.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { Logger } from "../infrastructure/logger.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { PlantUml } from "../tools/plant-uml.js";

export namespace PlantUmlBuild {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileBuilder(
            serviceProvider,
            () =>
                new FileBuilder(
                    serviceProvider.resolve(PlantUml.iServerServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create("PlantUmlBuild.FileBuilder")
                )
        );
    }

    const startumlString = "@startuml";
    const endumlString = "@enduml";

    export class FileBuilder implements Build.IFileBuilder {
        fileExtensions: string[] = ["puml", "plantuml"];

        public constructor(
            private plantUmlServer: PlantUml.Server,
            private buildOptions: Build.IOptions,
            private fileSystem: FileSystem.IFileSystem,
            private logger: Logger.ILogger
        ) {}

        async build(filePath: string): Promise<void> {
            const fileContent = await this.fileSystem.readFile(filePath);
            let position = 0;

            const outputDirectoryPath = this.fileSystem.clearPath(
                this.buildOptions.outputDirectoryPath,
                filePath.substring(this.buildOptions.sourceDirectoryPath.length + 1)
            );

            await this.fileSystem.delete(outputDirectoryPath);
            await this.fileSystem.createDirectory(outputDirectoryPath);

            for (let i = 1; ; i++) {
                const startIndex = fileContent.indexOf(startumlString, position);

                if (startIndex === -1) {
                    break;
                }

                const endIndex = fileContent.indexOf(endumlString, position);
                position = endIndex + endumlString.length;

                this.logger.debug(`Rendering diagram: ${i}`);

                const svg = await this.plantUmlServer.getSvg(fileContent.substring(startIndex, position));

                const outputFilePath = this.fileSystem.clearPath(outputDirectoryPath, `${i}.svg`);

                await this.fileSystem.createOrOverwriteFile(outputFilePath, svg);
            }
        }
    }
}
