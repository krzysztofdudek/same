import { Build } from "../core/build.js";
import { matchAll } from "../core/regExp.js";
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
        outputType = "html";

        public constructor(
            private plantUmlServer: PlantUml.Server,
            private buildOptions: Build.IOptions,
            private fileSystem: FileSystem.IFileSystem,
            private logger: Logger.ILogger
        ) {}

        async build(context: Build.FileBuildContext): Promise<void> {
            const outputDirectoryPath = this.fileSystem.clearPath(
                this.buildOptions.outputDirectoryPath,
                context.relativePath
            );

            await this.fileSystem.delete(outputDirectoryPath);
            await this.fileSystem.createDirectory(outputDirectoryPath);

            const startMatches = matchAll(context.content, /@start\w+/gm);

            for (let i = 0; i < startMatches.length; i++) {
                const startMatch = startMatches[i];
                const startIndex = startMatch.index!;
                let fragment = context.content.substring(startIndex);
                const endMatch = fragment.match(/@end\w+/gm);

                if (endMatch) {
                    const endIndex = endMatch.index!;
                    fragment = fragment.substring(0, endIndex) + endMatch[0];
                }

                this.logger.debug(`Rendering diagram: ${i + 1}`);

                const svg = await this.plantUmlServer.getSvg(fragment);

                const outputFilePath = this.fileSystem.clearPath(outputDirectoryPath, `${i + 1}.svg`);

                await this.fileSystem.createOrOverwriteFile(outputFilePath, svg);
            }
        }
    }
}
