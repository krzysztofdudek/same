import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

export namespace Java {
    export async function check() {
        const checkProcess = spawn('java', [ '-version' ]);

        let version: string | null = null;

        checkProcess.stderr.on('data', function (data) {
            const matches = /\d+\.\d+\.\d+/g.exec(data);

            if ((matches?.length ?? 0) > 0) {
                version = matches![0];
            }
        });

        checkProcess.on('exit', () => {
            if (version === null) {
                version = '0.0.0';
            }
        })

        while (version === null) {
            await setTimeout(10);
        }

        const matches = /[2-9]\d\.\d+\.\d+/g.exec(version);

        if ((matches?.length ?? 0) === 0) {
            throw new Error('Installation of Java 20+ is required.');
        }
    }
}