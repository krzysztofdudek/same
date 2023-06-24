import { ConfigurationError, ITool } from '../core/tool.js';
import { IServiceProvider } from '../infrastructure/abstraction/service-provider.js';
import { IShell } from '../infrastructure/abstraction/shell.js';

export namespace Graphviz {
    export function register(serviceProvider: IServiceProvider) {
        serviceProvider.register('graphviz', () => new Tool(serviceProvider.resolve('shell')));
    }

    export class Tool implements ITool {
        public constructor(
            private shell: IShell
            ) {}

        async configure(): Promise<void | ConfigurationError> {
            if (this.shell.isWindows()) {
                return;
            }

            const result = await this.shell.executeCommand('dot --version');

            if (result.statusCode !== 0) {
                return new ConfigurationError('Install Graphviz from: https://graphviz.org/download/');
            }
        }
    }
}