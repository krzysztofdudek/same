// import { Build } from "../core/build";
// import { FileSystem } from "../infrastructure/file-system";

// export namespace StructurizrBuild {
//     export class DependencyIntrospector implements Build.IFileDependencyIntrospector {
//         fileExtension: string = "dsl";

//         public constructor(private fileSystem: FileSystem.IFileSystem) {}

//         async getDependencies(filePath: string, fileContent: string): Promise<string[]> {
//             const regex = /workspace\s*extends\s*(.*)\s*{/g;
//             const matches = fileContent.matchAll(regex);

//             return [];
//         }
//     }
// }