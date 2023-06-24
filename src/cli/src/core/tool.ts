import { IFileSystem } from "../infrastructure/abstraction/file-system";
import { IToolsOptions } from "../tools/tools-options";

export class ConfigurationError {
    public constructor(public message: string) { }
}

export interface IToolset {
    configure(): Promise<void | ConfigurationError>;
}

export interface ITool {
    configure(): Promise<void | ConfigurationError>;
}

export interface IToolsetVersions {
    getToolVersion(name: string): Promise<string | null>;
    setToolVersion(name: string, version: string): Promise<void>;
}

export class Toolset implements IToolset {
    public constructor(
        private tools: ITool[] = []
    ) {}

    async configure(): Promise<void | ConfigurationError> {
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

export class ToolsetVersions implements IToolsetVersions {
    public constructor(
        private fileSystem: IFileSystem,
        private toolsOptions: IToolsOptions
    ) {}

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
            return {}
        }

        const file = await this.fileSystem.readFile(this.getPath());

        return JSON.parse(file) ?? {};
    }
    async saveFile(versions: Versions) {
        await this.fileSystem.createOrOverwriteFile(this.getPath(), JSON.stringify(versions));
    }
    getPath(): string {
        return this.fileSystem.clearPath(this.toolsOptions.toolsDirectoryPath, 'versions.json');
    }
}