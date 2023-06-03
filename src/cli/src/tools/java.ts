import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

export namespace Java {
    export async function check() {
        const java = spawn('java', [ '-version' ]);

        let version: string | null = null;

        java.stderr.on('data', function (data) {
            const matches = /\d+\.\d+\.\d+/g.exec(data);

            if ((matches?.length ?? 0) > 0) {
                version = matches![0];
            }
        });

        java.on('exit', () => {
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