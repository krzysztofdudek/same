import { FileSystem } from "../infrastructure/file-system";
import { ServiceProvider } from "../infrastructure/service-provider";

export namespace Toolset {
    export const iToolsOptionsServiceKey = "Toolset.IToolsOptions";
    export const iToolServiceKey = "Toolset.ITool";
    export const iToolsetServiceKey = "Toolset.IToolset";
    export const iToolsetVersionsServiceKey = "Toolset.IToolsetVersions";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iToolsOptionsServiceKey,
            () =>
                <IToolsOptions>{
                    toolsDirectoryPath: "",
                }
        );

        serviceProvider.registerSingleton(
            iToolsetVersionsServiceKey,
            () =>
                new ToolsetVersions(
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(iToolsOptionsServiceKey)
                )
        );

        serviceProvider.registerSingleton(
            iToolsetServiceKey,
            () =>
                new Toolset(
                    serviceProvider.resolveMany(iToolServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(iToolsOptionsServiceKey)
                )
        );
    }

    export class ConfigurationError {
        public constructor(public message: string) {}
    }

    export interface IToolsOptions {
        toolsDirectoryPath: string;
    }

    export interface ITool {
        configure(): Promise<void | ConfigurationError>;
    }

    export interface IToolset {
        configure(): Promise<void | ConfigurationError>;
    }

    export interface IToolsetVersions {
        getToolVersion(name: string): Promise<string | null>;
        setToolVersion(name: string, version: string): Promise<void>;
    }

    class Toolset implements IToolset {
        public constructor(
            private tools: ITool[] = [],
            private fileSystem: FileSystem.IFileSystem,
            private toolsOptions: IToolsOptions
        ) {}

        async configure(): Promise<void | ConfigurationError> {
            await this.fileSystem.createDirectory(this.toolsOptions.toolsDirectoryPath);

            for (let i = 0; i < this.tools.length; i++) {
                const tool = this.tools[i];

                const result = await tool.configure();

                if (result instanceof ConfigurationError) {
                    return result;
                }
            }
        }
    }

    type Versions = { [key: string]: string };

    class ToolsetVersions implements IToolsetVersions {
        public constructor(private fileSystem: FileSystem.IFileSystem, private toolsOptions: IToolsOptions) {}

        async getToolVersion(name: string): Promise<string | null> {
            const versions = await this.getFile();

            return versions[name] ?? null;
        }
        async setToolVersion(name: string, version: string): Promise<void> {
            const versions = await this.getFile();

            versions[name] = version;

            await this.saveFile(versions);
        }

        async getFile(): Promise<Versions> {
            if (await this.fileSystem.checkIfExists(this.getPath())) {
                return {};
            }

            const file = await this.fileSystem.readFile(this.getPath());

            return JSON.parse(file) ?? {};
        }
        async saveFile(versions: Versions) {
            await this.fileSystem.createOrOverwriteFile(this.getPath(), JSON.stringify(versions));
        }
        getPath(): string {
            return this.fileSystem.clearPath(this.toolsOptions.toolsDirectoryPath, "versions.json");
        }
    }
}
