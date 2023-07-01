import { Build } from "../core/build.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";

export namespace StructurizrBuild {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileDependencyIntrospector(
            serviceProvider,
            () => new FileDependencyIntrospector(serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );

        Build.registerFileAnalyzer(serviceProvider, () => new FileAnalyzer());
    }

    export class FileDependencyIntrospector implements Build.IFileDependencyIntrospector {
        fileExtension: string = "dsl";

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
        fileExtension: string = "dsl";

        async getAnalysisResults(filePath: string, fileContent: string): Promise<Build.AnalysisResult[]> {
            return [];
        }
    }
}
