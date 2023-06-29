import { FileSystem } from "../infrastructure/file-system.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";

export namespace Toolset {
    export const iOptionsServiceKey = "Toolset.IOptions";
    export const iToolServiceKey = "Toolset.ITool";
    export const iToolsetServiceKey = "Toolset.IToolset";
    export const iToolsetVersionsServiceKey = "Toolset.IToolsetVersions";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iOptionsServiceKey,
            () =>
                <IOptions>{
                    toolsDirectoryPath: "",
                }
        );

        serviceProvider.registerSingleton(
            iToolsetVersionsServiceKey,
            () =>
                new ToolsetVersions(
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(iOptionsServiceKey)
                )
        );

        serviceProvider.registerSingleton(
            iToolsetServiceKey,
            () =>
                new Toolset(
                    serviceProvider.resolveMany(iToolServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(iOptionsServiceKey)
                )
        );
    }

    export interface IOptions {
        toolsDirectoryPath: string;
    }

    export interface ITool {
        configure(): Promise<void>;
    }

    export interface IToolset {
        configure(): Promise<void>;
    }

    export interface IToolsetVersions {
        getToolVersion(name: string): Promise<string | null>;
        setToolVersion(name: string, version: string): Promise<void>;
    }

    class Toolset implements IToolset {
        public constructor(
            private tools: ITool[] = [],
            private fileSystem: FileSystem.IFileSystem,
            private toolsOptions: IOptions
        ) {}

        async configure(): Promise<void> {
            await this.fileSystem.createDirectory(this.toolsOptions.toolsDirectoryPath);

            for (let i = 0; i < this.tools.length; i++) {
                const tool = this.tools[i];

                await tool.configure();
            }
        }
    }

    type Versions = { [key: string]: string };

    class ToolsetVersions implements IToolsetVersions {
        public constructor(private fileSystem: FileSystem.IFileSystem, private toolsOptions: IOptions) {}

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
            if (!(await this.fileSystem.checkIfExists(this.getPath()))) {
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
