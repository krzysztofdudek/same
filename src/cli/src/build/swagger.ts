import { Build } from "../core/build.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { getObject } from "../infrastructure/functions/getObject.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import swagger from "swagger-ui-express";
import { Publish } from "../publish/publish-static-files.js";

export namespace SwaggerBuild {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileBuilder(
            serviceProvider,
            () =>
                new FileBuilder(
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey)
                )
        );

        Build.registerBuildExtension(
            serviceProvider,
            () =>
                new BuildExtension(
                    serviceProvider.resolve(Publish.iOptionsServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey)
                )
        );
    }

    export class FileBuilder implements Build.IFileBuilder {
        fileExtensions: string[] = ["json", "yaml", "yml"];
        outputType: string = "html";

        public constructor(private fileSystem: FileSystem.IFileSystem, private buildOptions: Build.IOptions) {}

        async build(context: Build.FileBuildContext): Promise<void> {
            const fileContent = await this.fileSystem.readFile(context.path);

            const object = getObject(fileContent, context.extension);

            if (!checkIfObjectIsSpecification(object)) {
                return;
            }

            const render = swagger.generateHTML(object);

            const outputFilePath = this.fileSystem.clearPath(
                this.buildOptions.outputDirectoryPath,
                context.relativePath.substring(0, context.relativePath.length - context.extension.length) + "html"
            );

            await this.fileSystem.createOrOverwriteFile(outputFilePath, render);
        }
    }

    export class BuildExtension implements Build.IBuildExtension {
        outputType: string = "html";

        public constructor(
            private publishOptions: Publish.IOptions,
            private buildOptions: Build.IOptions,
            private fileSystem: FileSystem.IFileSystem
        ) {}

        async onBuildStarted(): Promise<void> {}

        async onFileBuilt(file: Build.AnalyzedFile): Promise<void> {
            if (["json", "yaml", "yml"].indexOf(file.extension) === -1) {
                return;
            }

            const sourceFileContent = await this.fileSystem.readFile(file.path);
            const object = getObject(sourceFileContent, file.extension);

            if (!checkIfObjectIsSpecification(object)) {
                return;
            }

            const publishSpecificationFilePath = this.fileSystem.clearPath(
                this.publishOptions.outputDirectoryPath,
                file.compactPath
            );

            const htmlFileCompactPath = `${file.compactPath.substring(
                0,
                file.compactPath.length - file.extension.length
            )}html`;
            const builtFilePath = this.fileSystem.clearPath(this.buildOptions.outputDirectoryPath, htmlFileCompactPath);
            const publishHtmlFilePath = this.fileSystem.clearPath(
                this.publishOptions.outputDirectoryPath,
                htmlFileCompactPath
            );
            const publishDirectoryPath = this.fileSystem.getDirectory(publishHtmlFilePath);

            await this.fileSystem.createDirectory(publishDirectoryPath);

            await this.fileSystem.copy(file.path, publishSpecificationFilePath);
            await this.fileSystem.copy(builtFilePath, publishHtmlFilePath);
        }
    }

    export function checkIfObjectIsSpecification(object: any): boolean {
        return object.swagger || object.openapi;
    }
}
