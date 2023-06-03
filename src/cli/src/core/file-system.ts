import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

export async function iterateOverFilesInDirectory(directoryPath: string, extension: string[], callback: (filePath: string) => Promise<void>) {
    const filePaths = await getFilesRecursively(directoryPath, extension);

    for (let i = 0; i < filePaths.length; i++) {
        const absolutePath = path.resolve(filePaths[i]).replaceAll(/\\/g, '/');

        await callback(absolutePath);
    }
}

export async function getFilesRecursively(directoryPath: string, extension: string[]): Promise<string[]> {
    const directories = await fsPromises.readdir(directoryPath, { withFileTypes: true });
    const filesPaths = [];

    for (const entry of directories) {
        const entryPath = path.resolve(directoryPath, entry.name).replaceAll(/\\/g, '/');

        if (entry.isDirectory()) {
            filesPaths.push(...await getFilesRecursively(entryPath, extension));
        } else if (extension.find(x => x === path.extname(entryPath).substring(1))) {
            filesPaths.push(entryPath);
        }
    }

    return filesPaths;
}

export async function createDirectoryIfNotExists(directoryPath: string) {
    if (!fs.existsSync(directoryPath)) {
        await fsPromises.mkdir(directoryPath, { recursive: true });
    }
}

export async function deleteIfExists(path: string) {
    if (fs.existsSync(path)) {
        await fsPromises.unlink(path);
    }
}