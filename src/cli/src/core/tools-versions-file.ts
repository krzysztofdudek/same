import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';

export async function getVersion(toolsDirectoryPath: string, name: string): Promise<string | null> {
    const versions = await getVersions(toolsDirectoryPath);

    return versions[name] ?? null;
}

export async function saveVersion(toolsDirectoryPath: string, name: string, version: string) {
    const versions = await getVersions(toolsDirectoryPath);

    versions[name] = version;

    await saveVersions(toolsDirectoryPath, versions);
}

type Versions = { [key: string]: string };

async function getVersions(toolsDirectoryPath: string): Promise<Versions> {
    if (!fs.existsSync(getVersionsFilePath(toolsDirectoryPath))) {
        return {};
    }

    const file = await fsPromises.readFile(getVersionsFilePath(toolsDirectoryPath), {
        encoding: 'utf8'
    });

    const object = JSON.parse(file);

    return object ?? {};
}

async function saveVersions(toolsDirectoryPath: string, versions: Versions) {
    await fsPromises.writeFile(getVersionsFilePath(toolsDirectoryPath), JSON.stringify(versions), {
        encoding: 'utf-8'
    });
}

function getVersionsFilePath(toolsDirectoryPath: string): string {
    return path.join(toolsDirectoryPath, "versions.json");
}