import chalk from 'chalk';
import { getVersion, saveVersion } from './tools-versions-file.js';

export default async function setupTool(toolsDirectoryPath: string, name: string, version: string, configure: () => Promise<void>) {
    const downloadedVersion = await getVersion(toolsDirectoryPath, name);

    if (downloadedVersion === version) {
        console.debug(`${name} is up to date.`);

        return;
    }

    await configure();

    await saveVersion(toolsDirectoryPath, name, version);
}
