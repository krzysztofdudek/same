import { Build } from "../../core/build.js";
import { FileSystem } from "../../infrastructure/file-system.js";
import { handleFunctions } from "../shared.js";

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
