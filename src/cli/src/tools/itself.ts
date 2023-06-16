import { exec } from "child_process";
import { setTimeout } from 'timers/promises';
import { version as itselfVersion } from '../index.js';
import chalk from "chalk";

export namespace Itself {
    export async function check() {
        let version: string | null = null;

        const checkProcess = exec('npm view same-cli version', (_error, stdout, _stderr) => {
            version = stdout.trim();
        });

        while (checkProcess.exitCode === null) {
            await setTimeout(10);
        }

        if (version != itselfVersion) {
            console.log(chalk.bgRedBright('Please update this package with \"npm update same-cli\".'));

            await setTimeout(3000);
        }
    }
}