import { IManifestRepository, ManifestRepository, Options as ManifestRepositoryOptions } from "./core/manifest-file";
import { IFileSystem } from "./infrastructure/abstraction/file-system";
import { FileSystem } from "./infrastructure/implementation/file-system";

export const fileSystem: () => IFileSystem = () => new FileSystem();

export const manifestRepository: (options: ManifestRepositoryOptions) =>
    IManifestRepository = (options: ManifestRepositoryOptions) => new ManifestRepository(fileSystem(), options);