import { FileSystem } from "../infrastructure/file-system.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { Build } from "../core/build.js";
import { scriptJsFileContent, styleCssFileContent } from "./assets.js";

export namespace Publish {
    export const iOptionsServiceKey = "Publish.IOptions";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iOptionsServiceKey,
            () =>
                <IOptions>{
                    outputDirectoryPath: "",
                }
        );

        Build.registerBuildExtension(
            serviceProvider,
            () =>
                new BuildExtension(
                    serviceProvider.resolve(iOptionsServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey)
                )
        );
    }

    export interface IOptions {
        outputDirectoryPath: string;
        hostProtocol: string;
        hostName: string;
        hostPort: number;
    }

    export class BuildExtension implements Build.IBuildExtension {
        outputType: string = "html";

        public constructor(private options: IOptions, private fileSystem: FileSystem.IFileSystem) {}

        async onBuildStarted(): Promise<void> {
            const scriptJsFilePath = this.fileSystem.clearPath(this.options.outputDirectoryPath, "script.js");
            const styleCssFilePath = this.fileSystem.clearPath(this.options.outputDirectoryPath, "styles.css");

            await this.fileSystem.createDirectory(this.options.outputDirectoryPath);

            if (!(await this.fileSystem.checkIfExists(scriptJsFilePath))) {
                await this.fileSystem.createOrOverwriteFile(scriptJsFilePath, scriptJsFileContent);
            }

            if (!(await this.fileSystem.checkIfExists(styleCssFilePath))) {
                await this.fileSystem.createOrOverwriteFile(styleCssFilePath, styleCssFileContent);
            }
        }

        async onFileBuilt(_file: Build.AnalyzedFile): Promise<void> {}
    }
}
