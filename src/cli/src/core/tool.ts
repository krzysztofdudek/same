export class ConfigurationError {
    public constructor(public message: string) { }
}

export interface IToolset {
    register(tool: ITool): void;
    configure(): Promise<void | ConfigurationError>;
}

export interface ITool {
    configure(): Promise<void | ConfigurationError>;
}

export class Toolset implements IToolset {
    private tools: ITool[] = [];

    register(tool: ITool): void {
        this.tools.push(tool);
    }

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