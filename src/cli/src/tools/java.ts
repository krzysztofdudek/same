import { ConfigurationError, ITool } from '../core/tool';
import { IServiceProvider } from '../infrastructure/abstraction/service-provider';
import { IShell } from '../infrastructure/abstraction/shell';

export namespace Java {
    export function register(serviceProvider: IServiceProvider) {
        serviceProvider.register('java', () => new Tool(serviceProvider.resolve('shell')));
    }

    export class Tool implements ITool {
        public constructor(
            private shell: IShell
            ) {}

        async configure(): Promise<void | ConfigurationError> {
            const result = await this.shell.executeCommand('java -version');
            const matches = /[2-9]\d\.\d+\.\d+/g.exec(result.stderr);

            if ((matches?.length ?? 0) === 0) {
                return new ConfigurationError('Installation of Java 20+ is required.');
            }
        }
    }
}