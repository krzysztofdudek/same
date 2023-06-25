import { version as itselfVersion } from "../index.js";
import { Shell } from "../infrastructure/shell.js";
import { Toolset } from "../core/toolset.js";
import { Logger } from "../infrastructure/logger.js";
import { Awaiter } from "../infrastructure/awaiter.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";

export namespace Itself {
    export const toolServiceKey = "Itself.Tool";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingletonMany(
            [Toolset.iToolServiceKey, toolServiceKey],
            () =>
                new Tool(
                    serviceProvider.resolve(Shell.iShellServiceKey),
                    serviceProvider
                        .resolve<Logger.ILoggerFactory>(Logger.iLoggerFactoryServiceKey)
                        .create(toolServiceKey),
                    serviceProvider.resolve(Awaiter.iAwaiterServiceKey)
                )
        );
    }

    export class Tool implements Toolset.ITool {
        public constructor(
            private shell: Shell.IShell,
            private logger: Logger.ILogger,
            private awaiter: Awaiter.IAwaiter
        ) {}

        async configure(): Promise<void | Toolset.ConfigurationError> {
            const result = await this.shell.executeCommand("npm view same-cli version");
            const version = result.stdout;

            if (version != itselfVersion) {
                this.logger.warn('Please update this package with "npm update same-cli".');

                await this.awaiter.wait(3000);
            }

            return;
        }
    }
}
