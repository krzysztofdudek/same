import { ConfigurationError, ITool } from '../core/tool';
import { IShell } from '../infrastructure/abstraction/shell';

export class Java implements ITool {
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