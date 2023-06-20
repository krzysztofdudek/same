import fs from 'fs';
import fsPromises from 'fs/promises';
import { IFileSystem } from '../abstraction/file-system';

export class FileSystem implements IFileSystem {
    async delete(path: string): Promise<void> {
        fs.rmSync(path, {
            recursive: true
        });
    }
    async createDirectory(path: string): Promise<void> {
        if (!fs.existsSync(path)) {
            await fsPromises.mkdir(path, { recursive: true });
        }
    }
    async checkIfExists(path: string): Promise<boolean> {
        return fs.existsSync(path);
    }
    createOrOverwriteFile(path: string, content: string): Promise<void> {
        return fsPromises.writeFile(path, content, {
            encoding: 'utf-8'
        });
    }
    async readFile(path: string): Promise<string> {
        return await fsPromises.readFile(path, {
            encoding: 'utf-8'
        });
    }
}
