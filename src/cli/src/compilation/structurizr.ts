import { Compilation } from "../core/compilation";
import { FileSystem } from "../infrastructure/file-system";

export namespace StructurizrCompilation {
    export class DependencyIntrospector implements Compilation.IFileDependencyIntrospector {
        fileExtension: string = "dsl";

        public constructor(private fileSystem: FileSystem.IFileSystem) {}

        async getDependencies(filePath: string, fileContent: string): Promise<string[]> {
            const regex = /workspace\s*extends\s*(.*)\s*{/g;
            const matches = fileContent.matchAll(regex);
        }
    }
}
