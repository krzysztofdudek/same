import { Build } from "../core/build.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { FileSystem } from "../infrastructure/file-system.js";

export namespace MarkdownBuild {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileDependencyIntrospector(
            serviceProvider,
            () => new FileDependencyIntrospector(serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );

        Build.registerFileAnalyzer(serviceProvider, () => new FunctionsAnalyzer());
        Build.registerFileAnalyzer(
            serviceProvider,
            () => new LinksAnalyzer(serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );

        Build.registerFileBuilder(serviceProvider, () => new FileBuilder());
    }

    export class FileDependencyIntrospector implements Build.IFileDependencyIntrospector {
        fileExtensions: string[] = ["md"];

        public constructor(private fileSystem: FileSystem.IFileSystem) {}

        async getDependencies(filePath: string, fileContent: string): Promise<string[]> {
            const dependencies: string[] = [];

            await handleFunctions(fileContent, async (functionName, parameters) => {
                switch (functionName) {
                    case "import":
                    case "code":
                        const path = this.fileSystem.clearPath(this.fileSystem.getDirectory(filePath), parameters[0]);

                        if (dependencies.indexOf(path) !== -1) {
                            break;
                        }

                        dependencies.push(path);
                        break;
                }
            });

            return dependencies;
        }
    }

    export class FunctionsAnalyzer implements Build.IFileAnalyzer {
        fileExtensions: string[] = ["md"];

        async getAnalysisResults(filePath: string, fileContent: string): Promise<Build.AnalysisResult[]> {
            const analysisResults: Build.AnalysisResult[] = [];

            await handleFunctions(fileContent, async (functionName, parameters, line, column) => {
                if (functionName === "import") {
                    if (parameters.length === 0 || parameters[0].length === 0) {
                        analysisResults.push(
                            new Build.AnalysisResult(
                                Build.AnalysisResultType.Error,
                                "Import function requires file path parameter.",
                                line,
                                column
                            )
                        );
                    }

                    if (parameters[0].endsWith(".dsl") && parameters.length !== 2) {
                        analysisResults.push(
                            new Build.AnalysisResult(
                                Build.AnalysisResultType.Error,
                                'Import function of "dsl" file requires second parameters specified with diagram name.',
                                line,
                                column
                            )
                        );
                    }
                }
            });

            return analysisResults;
        }
    }

    export class LinksAnalyzer implements Build.IFileAnalyzer {
        fileExtensions: string[] = ["md"];

        public constructor(private fileSystem: FileSystem.IFileSystem) {}

        async getAnalysisResults(filePath: string, fileContent: string): Promise<Build.AnalysisResult[]> {
            const analysisResults: Build.AnalysisResult[] = [];

            await iterateMatches(fileContent, /\[([^\]]+)\]\(([^)]+)\)/g, async (match, line, column) => {
                const resource = match[2];

                if (resource.match(/\w+:\/\//)) {
                } else {
                    const path = this.fileSystem.clearPath(resource);

                    if (!(await this.fileSystem.checkIfExists(path))) {
                        analysisResults.push(
                            new Build.AnalysisResult(
                                Build.AnalysisResultType.Warning,
                                "Linked file does not exists.",
                                line,
                                column
                            )
                        );
                    }
                }
            });

            return analysisResults;
        }
    }

    export class FileBuilder implements Build.IFileBuilder {
        fileExtensions: string[] = ["md"];

        async build(filePath: string): Promise<void> {}
    }

    async function handleFunctions(
        content: string,
        handle: (functionName: string, parameters: string[], line?: number, column?: number) => Promise<void>
    ) {
        await iterateMatches(content, /@(\w+)\((.*)\)/g, async (match, line, column) => {
            const functionName = match[1];
            const parameters = match[2].split(",").map((x) => x.trim());

            await handle(functionName, parameters, line, column);
        });
    }

    async function iterateMatches(
        content: string,
        regex: RegExp,
        handle: (match: RegExpMatchArray, line: number, column: number) => Promise<void>
    ) {
        const matches = content.matchAll(regex);
        let match: IteratorResult<RegExpMatchArray, any>;

        while ((match = matches.next()).done !== true) {
            const fragment = content.substring(0, match.value.index);
            const line = (fragment.match(/\n/g)?.length ?? 0) + 1;
            const column = fragment.length - fragment.lastIndexOf("\n");

            await handle(match.value, line, column);
        }
    }
}
