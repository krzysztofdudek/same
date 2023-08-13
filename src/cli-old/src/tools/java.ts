import { Toolset } from "../core/toolset.js";
import { Logger } from "../infrastructure/logger.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { Shell } from "../infrastructure/shell.js";

export namespace Java {
    export const toolServiceKey = "Java.Tool";

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
            const result = await this.shell.executeCommand("java -version");
            const matches = /[2-9]\d\.\d+\.\d+/g.exec(result.stderr);

            if ((matches?.length ?? 0) === 0) {
                this.logger.error("Installation of Java 20+ is required");

                throw new Error();
            }

            this.logger.debug("Java 20+ is installed");
        }
    }
}
