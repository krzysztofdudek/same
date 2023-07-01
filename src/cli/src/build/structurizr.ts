import { Build } from "../core/build.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { Structurizr } from "../tools/structurizr.js";

export namespace StructurizrBuild {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileDependencyIntrospector(
            serviceProvider,
            () => new FileDependencyIntrospector(serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );

        Build.registerFileAnalyzer(serviceProvider, () => new FileAnalyzer());

        Build.registerFileBuilder(
            serviceProvider,
            () =>
                new FileBuilder(
                    serviceProvider.resolve(Structurizr.toolServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey)
                )
        );
    }

    export class FileDependencyIntrospector implements Build.IFileDependencyIntrospector {
        fileExtensions: string[] = ["dsl"];

        public constructor(private fileSystem: FileSystem.IFileSystem) {}

        async getDependencies(filePath: string, fileContent: string): Promise<string[]> {
            const regex = /workspace\s*extends\s*(.*)\s*{/g;
            const matches = fileContent.matchAll(regex);

            let match: IteratorResult<RegExpMatchArray, any>;
            const results: string[] = [];

            while ((match = matches.next()).done !== true) {
                const path = this.fileSystem.clearPath(this.fileSystem.getDirectory(filePath), match.value[1].trim());

                if (results.indexOf(path) !== -1) {
                    continue;
                }

                results.push(path);
            }

            return results;
        }
    }

    export class FileAnalyzer implements Build.IFileAnalyzer {
        fileExtensions: string[] = ["dsl"];

        async getAnalysisResults(filePath: string, fileContent: string): Promise<Build.AnalysisResult[]> {
            return [];
        }
    }

    export class FileBuilder implements Build.IFileBuilder {
        fileExtensions: string[] = ["dsl"];

        constructor(
            private structurizrTool: Structurizr.ITool,
            private buildOptions: Build.IOptions,
            private fileSystem: FileSystem.IFileSystem
        ) {}

        async build(filePath: string): Promise<void> {
            const fileExtension = this.fileSystem.getExtension(filePath);
            const directory = this.fileSystem.clearPath(
                filePath.substring(this.buildOptions.sourceDirectoryPath.length + 1)
            );

            await this.structurizrTool.generateDiagrams(filePath);
        }
    }
}
