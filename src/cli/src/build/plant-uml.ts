import { Build } from "../core/build.js";
import { matchAll } from "../core/regExp.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { Logger } from "../infrastructure/logger.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { Publish } from "../publish/publish.js";
import { PlantUml } from "../tools/plant-uml.js";

export namespace PlantUmlBuild {
    export const linkTransformerServiceKey = "PlantUmlBuild.LinkTransformer";

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
                        .create("PlantUmlBuild.FileBuilder"),
                    serviceProvider.resolve(linkTransformerServiceKey)
                )
        );

        serviceProvider.registerSingleton(
            linkTransformerServiceKey,
            () =>
                new LinkTransformer(
                    serviceProvider.resolve(Build.iOptionsServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(Publish.iOptionsServiceKey)
                )
        );
    }

    export class FileBuilder implements Build.IFileBuilder {
        fileExtensions: string[] = ["puml", "plantuml"];
        outputType = "html";

        public constructor(
            private plantUmlServer: PlantUml.Server,
            private buildOptions: Build.IOptions,
            private fileSystem: FileSystem.IFileSystem,
            private logger: Logger.ILogger,
            private linkTransformer: LinkTransformer
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
                const endMatch = fragment.match(/@end\w+/m);

                if (endMatch) {
                    const endIndex = endMatch.index!;
                    fragment = fragment.substring(0, endIndex) + endMatch[0];
                }

                this.logger.debug(`Rendering diagram: ${i + 1}`);

                fragment = this.linkTransformer.transformLinks(context, fragment);

                const svg = await this.plantUmlServer.getSvg(fragment);

                const outputFilePath = this.fileSystem.clearPath(outputDirectoryPath, `${i + 1}.svg`);

                await this.fileSystem.createOrOverwriteFile(outputFilePath, svg);
            }
        }
    }

    const linkRegexp = /\[\[([^ ]+)\s*([^\]]+)\]\]/g;
    const urlRegexp = /(?:(\w+)(?:\:\/\/))?(\/)?([^#]*)?(#)?([\w\d\-\%\+]*)?/;

    export class LinkTransformer {
        public constructor(
            private buildOptions: Build.IOptions,
            private fileSystem: FileSystem.IFileSystem,
            private publishOptions: Publish.IOptions
        ) {}

        transformLinks(context: Build.FileBuildContext, fragment: string): string {
            let newFragment: string = fragment;
            const linksMatches = matchAll(fragment, linkRegexp);

            for (let j = 0; j < linksMatches.length; j++) {
                const linkMatch = linksMatches[j];
                const url = linkMatch[1];
                const title = linkMatch[2];
                const urlMatch = urlRegexp.exec(url)!;
                const protocol = urlMatch[1];
                const absoluteSlash = urlMatch[2];
                const path = urlMatch[3];
                const anchorMark = urlMatch[4];
                const anchor = urlMatch[5];

                if (protocol) {
                    continue;
                }

                if (!path) {
                    continue;
                }

                let filePath: string;

                if (absoluteSlash) {
                    filePath = this.fileSystem.clearPath(this.buildOptions.sourceDirectoryPath, path);
                } else {
                    filePath = this.fileSystem.clearPath(this.fileSystem.getDirectory(context.path), path);
                }

                const fileExtension = this.fileSystem.getExtension(filePath);

                const urlFragment =
                    filePath.substring(
                        this.buildOptions.sourceDirectoryPath.length + 1,
                        filePath.length - fileExtension.length
                    ) + "html";

                const linkRender = `[[${this.publishOptions.createBaseUrl()}/${urlFragment}${
                    anchorMark ? `#${anchor}` : ""
                } ${title}]]`;

                newFragment = newFragment.replaceAll(linkMatch[0], linkRender);
            }

            return newFragment;
        }
    }
}
