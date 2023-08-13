import { FileSystem } from "../infrastructure/file-system.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { Build } from "../core/build.js";
import { scriptJsFileContent, styleCssFileContent } from "./assets.js";
import { asyncForeach } from "../core/index.js";

export namespace Publish {
    export const iOptionsServiceKey = "Publish.IOptions";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iOptionsServiceKey,
            () =>
                <IOptions>{
                    createBaseUrl() {
                        return `${this.hostProtocol}://${this.hostName}:${this.hostPort}`;
                    },
                }
        );

        Build.registerBuildExtension(
            serviceProvider,
            () =>
                new BuildExtension(
                    serviceProvider.resolve(iOptionsServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey)
                )
        );
    }

    export interface IOptions {
        outputDirectoryPath: string;
        hostPort: number;
        hostProtocol: string;
        hostName: string;

        createBaseUrl(): string;
    }

    export class BuildExtension implements Build.IBuildExtension {
        outputType: string = "html";

        public constructor(
            private options: IOptions,
            private fileSystem: FileSystem.IFileSystem,
            private buildOptions: Build.IOptions
        ) {}

        async onBuildStarted(): Promise<void> {
            const scriptJsFilePath = this.fileSystem.clearPath(this.options.outputDirectoryPath, "script.js");
            const styleCssFilePath = this.fileSystem.clearPath(this.options.outputDirectoryPath, "styles.css");

            await this.fileSystem.createDirectory(this.options.outputDirectoryPath);

            await this.fileSystem.createOrOverwriteFile(scriptJsFilePath, scriptJsFileContent);

            await this.fileSystem.createOrOverwriteFile(styleCssFilePath, styleCssFileContent);

            let images = await this.fileSystem.getFilesRecursively(this.buildOptions.sourceDirectoryPath);
            images = images.filter(
                (x) => ["jpg", "jpeg", "png", "gif"].indexOf(this.fileSystem.getExtension(x)) !== -1
            );

            await asyncForeach(images, async (sourceFilePath) => {
                const outputFilePath = this.fileSystem.clearPath(
                    this.options.outputDirectoryPath,
                    sourceFilePath.substring(this.buildOptions.sourceDirectoryPath.length + 1)
                );
                const directoryPath = this.fileSystem.getDirectory(outputFilePath);

                await this.fileSystem.createDirectory(directoryPath);
                await this.fileSystem.copy(sourceFilePath, outputFilePath);
            });
        }

        async onFileBuilt(_file: Build.AnalyzedFile): Promise<void> {}
    }
}
