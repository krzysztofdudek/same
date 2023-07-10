import { Build } from "../../core/build.js";
import { FileSystem } from "../../infrastructure/file-system.js";
import { MarkdownBuild } from "../markdown.js";

export function parameterDependencyIntrospector(
    functionName: string,
    parameter: number,
    fileSystem: FileSystem.IFileSystem
): Build.IFileDependencyIntrospector {
    class FirstParameterDependencyIntrospector implements Build.IFileDependencyIntrospector {
        fileExtensions: string[] = ["md"];

        public constructor(private fileSystem: FileSystem.IFileSystem) {}

        async getDependencies(path: string, _relativePath: string, content: string): Promise<string[]> {
            const dependencies: string[] = [];

            const functions = MarkdownBuild.matchAllFunctions(content);

            for (let i = 0; i < functions.length; i++) {
                const _function = functions[i];

                if (_function.functionName === functionName) {
                    const dependency = this.fileSystem.clearPath(
                        this.fileSystem.getDirectory(path),
                        _function.parameters[parameter]
                    );

                    if (dependencies.indexOf(dependency) !== -1) {
                        continue;
                    }

                    dependencies.push(dependency);
                }
            }

            return dependencies;
        }
    }

    return new FirstParameterDependencyIntrospector(fileSystem);
}
