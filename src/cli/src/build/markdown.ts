import { Build } from "../core/build.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { FileSystem } from "../infrastructure/file-system.js";

export namespace MarkdownBuild {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileDependencyIntrospector(
            serviceProvider,
            () => new FileDependencyIntrospector(serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );

        Build.registerFileBuilder(serviceProvider, () => new FileBuilder());
    }

    export class FileDependencyIntrospector implements Build.IFileDependencyIntrospector {
        fileExtensions: string[] = ["md"];

        public constructor(private fileSystem: FileSystem.IFileSystem) {}

        async getDependencies(filePath: string, fileContent: string): Promise<string[]> {
            const dependencies: string[] = [];

            const regex = /@(\w+)\((.*)\)/g;
            const matches = fileContent.matchAll(regex);
            let match: IteratorResult<RegExpMatchArray, any>;

            while ((match = matches.next()).done !== true) {
                const functionName = match.value[1];
                const parameters = match.value[2].split(",").map((x) => x.trim());

                switch (functionName) {
                    case "import":
                    case "code":
                        const path = this.fileSystem.clearPath(this.fileSystem.getDirectory(filePath), parameters[0]);

                        if (dependencies.indexOf(path) !== -1) {
                            continue;
                        }

                        dependencies.push(path);
                        break;
                }
            }

            return dependencies;
        }
    }

    export class FunctionsAnalyzer implements Build.IFileAnalyzer {
        fileExtensions: string[] = ["md"];

        async getAnalysisResults(filePath: string, fileContent: string): Promise<Build.AnalysisResult[]> {
            const regex = /@(\w+)\((.*)\)/g;
            const matches = fileContent.matchAll(regex);
            let match: IteratorResult<RegExpMatchArray, any>;

            while ((match = matches.next()).done !== true) {
                const functionName = match.value[1];
                const parameters = match.value[2].split(",").map((x) => x.trim());
            }
        }
    }

    export class FileBuilder implements Build.IFileBuilder {
        fileExtensions: string[] = ["md"];

        async build(filePath: string): Promise<void> {}
    }

    async function handleFunctions(
        content: string,
        handle: (functionName: string, parameters: string[]) => Promise<void>
    ) {
        const regex = /@(\w+)\((.*)\)/g;
        const matches = content.matchAll(regex);
        let match: IteratorResult<RegExpMatchArray, any>;

        while ((match = matches.next()).done !== true) {
            const functionName = match.value[1];
            const parameters = match.value[2].split(",").map((x) => x.trim());

            await handle(functionName, parameters);
        }
    }
}
