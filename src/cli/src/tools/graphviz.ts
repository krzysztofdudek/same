import { Toolset } from "../core/toolset.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { Shell } from "../infrastructure/shell.js";

export namespace Graphviz {
    export const toolServiceKey = "Graphviz.Tool";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingletonMany(
            [Toolset.iToolServiceKey, toolServiceKey],
            () => new Tool(serviceProvider.resolve(Shell.iShellServiceKey))
        );
    }

    export class Tool implements Toolset.ITool {
        public constructor(private shell: Shell.IShell) {}

        async configure(): Promise<void | Toolset.ConfigurationError> {
            if (this.shell.isWindows()) {
                return;
            }

            const result = await this.shell.executeCommand("dot --version");

            if (result.statusCode !== 0) {
                return new Toolset.ConfigurationError("Install Graphviz from: https://graphviz.org/download/");
            }
        }
    }
}
