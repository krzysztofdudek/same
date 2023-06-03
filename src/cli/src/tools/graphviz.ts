import chalk from 'chalk';
import { exec } from 'child_process';
import { setTimeout } from 'timers/promises';

export namespace Graphviz {
    export async function check() {
        if (process.platform === 'win32') {
            return;
        }

        const dotProcess = exec('dot --version');

        while (dotProcess.exitCode === null) {
            await setTimeout(100);
        }

        if (dotProcess.exitCode !== 0) {
            console.log(chalk.redBright('Install Graphviz from: https://graphviz.org/download/'));

            throw new Error('Graphviz installation is invalid.');
        }
    }
}