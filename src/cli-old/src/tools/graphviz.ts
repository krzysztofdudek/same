import { Toolset } from "../core/toolset.js";
import { Logger } from "../infrastructure/logger.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { Shell } from "../infrastructure/shell.js";

export namespace Graphviz {
    export const toolServiceKey = "Graphviz.Tool";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingletonMany(
            [Toolset.iToolServiceKey, toolServiceKey],
            () =>
                new Tool(
                    serviceProvider.resolve(Shell.iShellServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create(toolServiceKey)
                )
        );
    }

    export class Tool implements Toolset.ITool {
        public constructor(private shell: Shell.IShell, private logger: Logger.ILogger) {}

        async configure(): Promise<void> {
            if (this.shell.isWindows()) {
                this.logger.debug("Windows does not require Graphviz standalone installation");

                return;
            }

            const result = await this.shell.executeCommand("dot -V");

            if (result.exitCode !== 0) {
                this.logger.error("Install Graphviz from: https://graphviz.org/download/");

                throw new Error();
            }

            this.logger.debug("Graphviz is installed");
        }
    }
}
