import { GitHub } from "../core/github.js";
import { Toolset } from "../core/toolset.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { HttpClient } from "../infrastructure/http-client.js";
import { Logger } from "../infrastructure/logger.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { Shell } from "../infrastructure/shell.js";

const toolName = "Structurizr";
const toolFileName = "structurizr.zip";
const decompressedDirectory = "structurizr";

export namespace Structurizr {
    export const toolServiceKey = "Structurizr.Tool";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            toolServiceKey,
            () =>
                new Tool(
                    serviceProvider.resolve(Toolset.iToolsOptionsServiceKey),
                    serviceProvider.resolve(GitHub.iGitHubServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(Toolset.iToolsetVersionsServiceKey),
                    serviceProvider.resolve(HttpClient.iHttpClientServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create(toolServiceKey),
                    serviceProvider.resolve(Shell.iShellServiceKey)
                )
        );
    }

    export class Tool implements Toolset.ITool {
        public constructor(
            private toolsOptions: Toolset.IToolsOptions,
            private gitHub: GitHub.IGitHub,
            private fileSystem: FileSystem.IFileSystem,
            private toolsetVersions: Toolset.IToolsetVersions,
            private httpClient: HttpClient.IHttpClient,
            private logger: Logger.ILogger,
            private shell: Shell.IShell
        ) {}

        async configure() {
            const latestVersionDescriptor = await this.gitHub.getLatestRelease(
                "structurizr",
                "cli",
                /structurizr\-cli\-.+\.zip/
            );

            const currentVersion = await this.toolsetVersions.getToolVersion(toolName);

            if (latestVersionDescriptor.name === currentVersion) {
                return;
            }

            const zipPath = this.fileSystem.clearPath(this.toolsOptions.toolsDirectoryPath, toolFileName);
            const unzippedDirectory = this.fileSystem.clearPath(
                this.toolsOptions.toolsDirectoryPath,
                decompressedDirectory
            );

            await this.fileSystem.delete(unzippedDirectory);
            this.logger.debug("Downloading binaries.");
            await this.httpClient.downloadFile(latestVersionDescriptor.url, zipPath);
            this.logger.debug("Unpacking binaries.");
            await this.fileSystem.unzip(zipPath, unzippedDirectory);
            this.logger.debug("Ready.");
            await this.fileSystem.delete(zipPath);

            await this.toolsetVersions.setToolVersion(toolName, latestVersionDescriptor.name);
        }

        async generateDiagrams(filePath: string, outputDirectoryPath: string) {
            await this.fileSystem.delete(outputDirectoryPath);
            await this.fileSystem.createDirectory(outputDirectoryPath);

            const jarPath = this.fileSystem
                .clearPath(this.toolsOptions.toolsDirectoryPath, decompressedDirectory, "lib")
                .replaceAll(/\\/g, "/");

            const result = await this.shell.executeCommand(
                `java -cp "${jarPath}/*" com.structurizr.cli.StructurizrCliApplication export -workspace "${filePath}" -format plantuml/c4plantuml -output "${outputDirectoryPath}"`
            );

            if (result.stderr.trim().length > 0) {
                this.logger.error(result.stderr);
            }
        }
    }
}
