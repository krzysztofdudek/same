import { FileSystem } from "../infrastructure/file-system.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { Build } from "./build.js";

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
                new StaticFilesPublisher(
                    serviceProvider.resolve(iOptionsServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey)
                )
        );
    }

    export interface IOptions {
        outputDirectoryPath: string;
    }

    export class StaticFilesPublisher implements Build.IBuildExtension {
        public constructor(private options: IOptions, private fileSystem: FileSystem.IFileSystem) {}

        async onFileBuilt(file: Build.AnalyzedFile): Promise<void> {
            if (file.extension !== "md") {
                return;
            }

            console.log(file.path);
        }
    }
}
