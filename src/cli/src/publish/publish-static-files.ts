import { FileSystem } from "../infrastructure/file-system.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { Build } from "../core/build.js";
import { Manifest } from "../core/manifest.js";
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
                    serviceProvider.resolve(Build.iOptionsServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(Manifest.iRepositoryServiceKey)
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

        public constructor(
            private options: IOptions,
            private buildOptions: Build.IOptions,
            private fileSystem: FileSystem.IFileSystem,
            private manifestRepository: Manifest.IRepository
        ) {}

        async onBuildStarted(): Promise<void> {
            const scriptJsFilePath = this.fileSystem.clearPath(this.options.outputDirectoryPath, "script.js");
            const styleCssFilePath = this.fileSystem.clearPath(this.options.outputDirectoryPath, "styles.css");

            if (!(await this.fileSystem.checkIfExists(scriptJsFilePath))) {
                await this.fileSystem.createOrOverwriteFile(scriptJsFilePath, scriptJsFileContent);
            }

            if (!(await this.fileSystem.checkIfExists(styleCssFilePath))) {
                await this.fileSystem.createOrOverwriteFile(styleCssFilePath, styleCssFileContent);
            }
        }

        async onFileBuilt(file: Build.AnalyzedFile): Promise<void> {
            await this.fileSystem.createDirectory(this.options.outputDirectoryPath);

            if (file.extension === "md") {
                const compactPath = `${file.compactPath.substring(
                    0,
                    file.compactPath.length - file.extension.length
                )}html`;

                const sourcePath = this.fileSystem.clearPath(this.buildOptions.outputDirectoryPath, compactPath);
                const outputPath = this.fileSystem.clearPath(this.options.outputDirectoryPath, compactPath);

                let content = await this.fileSystem.readFile(sourcePath);
                const manifest = <Manifest.Manifest>await this.manifestRepository.load();

                const header = [
                    manifest.name,
                    ...file.compactPath
                        .split("/")
                        .map((x) => x.trim().substring(0, x.trim().lastIndexOf(".")))
                        .filter((x) => x.length > 1 && x !== "index")
                        .map((x) =>
                            x
                                .split("-")
                                .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
                                .join(" ")
                        ),
                ].join(" > ");

                content = `<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="${this.options.hostProtocol}://${this.options.hostName}:${
                    this.options.hostPort
                }/styles.css">
        <title>${manifest.name}</title>
        <style>
            body {
                padding: 1em;
            }
        </style>
        <script src="${this.options.hostProtocol}://${this.options.hostName}:${
                    this.options.hostPort
                }/script.js" type="text/javascript"></script>
    </head>
    <body class="markdown-body">
        ${content.indexOf("h1") < 0 ? `<h1>${header}</h1>` : ""}
${content}
    </body>
</html>`;

                await this.fileSystem.createOrOverwriteFile(outputPath, content);
            }
        }
    }
}
