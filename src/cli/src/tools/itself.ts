import { version as itselfVersion } from '../index.js';
import { IShell } from "../infrastructure/abstraction/shell.js";
import { ConfigurationError, ITool } from "../core/tool.js";
import { ILogger, ILoggerFactory } from "../infrastructure/abstraction/logger.js";
import { IAwaiter } from '../infrastructure/abstraction/awaiter.js';
import { IServiceProvider } from '../infrastructure/abstraction/service-provider.js';

export namespace Itself {
    export function register(serviceProvider: IServiceProvider) {
        serviceProvider.register('graphviz', () => new Tool(
            serviceProvider.resolve('shell'),
            serviceProvider.resolve<ILoggerFactory>('loggerFactory').create('Itself'),
            serviceProvider.resolve('awaiter')));
    }

    export class Tool implements ITool {
        public constructor(
            private shell: IShell,
            private logger: ILogger,
            private awaiter: IAwaiter
        ) { }

        async configure(): Promise<void | ConfigurationError> {
            const result = await this.shell.executeCommand('npm view same-cli version');
            const version = result.stdout;

            if (version != itselfVersion) {
                this.logger.warn('Please update this package with \"npm update same-cli\".');

                await this.awaiter.wait(3000);
            }

            return
        }
    }
}