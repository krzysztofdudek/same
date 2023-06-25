import { Toolset } from "../core/toolset";
import { ServiceProvider } from "../infrastructure/service-provider";
import { Shell } from "../infrastructure/shell";

export namespace Java {
    export const toolServiceKey = "Java.Tool";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingletonMany(
            [Toolset.iToolServiceKey, toolServiceKey],
            () => new Tool(serviceProvider.resolve(Shell.iShellServiceKey))
        );
    }

    export class Tool implements Toolset.ITool {
        public constructor(private shell: Shell.IShell) {}

        async configure(): Promise<void | Toolset.ConfigurationError> {
            const result = await this.shell.executeCommand("java -version");
            const matches = /[2-9]\d\.\d+\.\d+/g.exec(result.stderr);

            if ((matches?.length ?? 0) === 0) {
                return new Toolset.ConfigurationError("Installation of Java 20+ is required.");
            }
        }
    }
}
