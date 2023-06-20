import { ConfigurationError, ITool } from '../core/tool.js';
import { IShell } from '../infrastructure/abstraction/shell.js';

export class Graphviz implements ITool {
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