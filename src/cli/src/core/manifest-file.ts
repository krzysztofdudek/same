import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { createDirectoryIfNotExists } from './file-system.js';

export class ManifestFile {
    private filePath: string;
    public name: string = '';

    public constructor(directoryPath: string) {
        this.filePath = path.join(directoryPath, 'manifest.json');
    }

    async save() {
        const content = JSON.stringify({
            name: this.name
        }, undefined, 2);

        const directoryPath = path.dirname(this.filePath);

        await createDirectoryIfNotExists(directoryPath);

        await fsPromises.writeFile(this.filePath, content, {
            encoding: 'utf-8'
        });
    }

    async load() {
        if (!fs.existsSync(this.filePath)) {
            throw new Error('Manifest file is not initialized. Please use \'initialize\' command.');
        }

        const content = await fsPromises.readFile(this.filePath, {
            encoding: 'utf-8'
        });

        const object = JSON.parse(content);

        this.name = object.name;
    }

    isSaved(): boolean {
        return fs.existsSync(this.filePath);
    }
}