import fs from "fs";
import fsPromises from "fs/promises";
import { join, resolve } from "path";
import { ServiceProvider } from "./service-provider";
import decompress from "decompress";
import absoluteUnixPath from "./functions/absoluteUnixPath";

export namespace FileSystem {
    export const iFileSystemServiceKey = "FileSystem.IFileSystem";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(iFileSystemServiceKey, () => new FileSystem());
    }

    export interface IFileSystem {
        checkIfExists(path: string): Promise<boolean>;
        createOrOverwriteFile(path: string, content: string): Promise<void>;
        createFileIfNotExists(path: string, content: string): Promise<void>;
        readFile(path: string): Promise<string>;
        createDirectory(path: string): Promise<void>;
        delete(path: string): Promise<void>;
        clearPath(...pathComponents: string[]): string;
        unzip(sourcePath: string, targetPath: string): Promise<void>;
    }

    export class FileSystem implements IFileSystem {
        async unzip(sourcePath: string, targetPath: string): Promise<void> {
            await decompress(sourcePath, targetPath);
        }
        clearPath(...pathComponents: string[]): string {
            return absoluteUnixPath(...pathComponents);
        }
        async createFileIfNotExists(path: string, content: string): Promise<void> {
            if (!fs.existsSync(path)) {
                await fsPromises.writeFile(path, content, {
                    encoding: "utf-8",
                });
            }
        }
        async delete(path: string): Promise<void> {
            if (fs.existsSync(path)) {
                fs.rmSync(path, {
                    recursive: true,
                });
            }
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
                encoding: "utf-8",
            });
        }
        async readFile(path: string): Promise<string> {
            return await fsPromises.readFile(path, {
                encoding: "utf-8",
            });
        }
    }
}