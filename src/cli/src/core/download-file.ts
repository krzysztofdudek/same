import fs from 'fs';
import fsPromises from 'fs/promises';
import https from 'https';
import chalk from 'chalk';

export default async function downloadFile(resource: string, url: string, path: string): Promise<unknown> {
    if (fs.existsSync(path)) {
        await fsPromises.unlink(path);
    }

    return new Promise(async (resolve, reject) => {
        https.get(url, async function (response) {
            if (response.statusCode === 200) {
                console.debug(`Downloading ${resource}.`);

                const file = fs.createWriteStream(path, { flags: 'wx' });

                async function handleError(error: any) {
                    file.close(async function (fileClosingError) {
                        if (fileClosingError) {
                            console.error(chalk.redBright('Error occurred while closing file.'));

                            reject(fileClosingError);
                        } else {
                            if (fs.existsSync(path)) {
                                await fsPromises.unlink(path);
                            }

                            reject(error);
                        }
                    });
                }

                file.on('error', function (error) {
                    console.error(chalk.redBright('Error occurred while saving file.'));

                    handleError(error);
                });


                response.on('error', function (error) {
                    console.error(chalk.redBright('Error occurred while fetching file.'));

                    handleError(error);
                });

                response.on('end', () => {
                    console.debug(`${resource} downloaded.`);

                    file.end();

                    resolve({});
                }).pipe(file);
            } else if (response.statusCode === 302 || response.statusCode === 301) {
                // Recursively follow redirects, only a 200 will resolve.
                await downloadFile(resource, response.headers.location!, path).then(() => resolve({}));
            } else {
                reject(new Error(`Download request failed, response status: ${response.statusCode} ${response.statusMessage}`));
            }
        });
    });
}
