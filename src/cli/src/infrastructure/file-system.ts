import fs from "fs";
import fsPromises from "fs/promises";
import { ServiceProvider } from "./service-provider.js";
import decompress from "decompress";
import absoluteUnixPath from "./functions/absoluteUnixPath.js";
import { dirname, extname, basename } from "path";

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
        getFilesRecursively(directoryPath: string): Promise<string[]>;
        getExtension(path: string): string;
        getDirectory(path: string): string;
        getName(path: string): string;
        watchRecursive(path: string, callback: (path: string) => void): void;
    }

    export class FileSystem implements IFileSystem {
        watchRecursive(path: string, callback: (path: string) => void): void {
            fs.watch(
                path,
                {
                    recursive: true,
                },
                (eventType, fileName) => {
                    if (!(typeof fileName === "string")) {
                        return;
                    }

                    if (eventType === "change") {
                        callback(this.clearPath(path, fileName));
                    }
                }
            );
        }
        getName(path: string): string {
            return basename(path);
        }
        getDirectory(path: string): string {
            return this.clearPath(dirname(path));
        }
        getExtension(path: string): string {
            return extname(path).substring(1);
        }
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
        async getFilesRecursively(directoryPath: string): Promise<string[]> {
            const directories = await fsPromises.readdir(directoryPath, { withFileTypes: true });
            const filesPaths = [];

            for (const entry of directories) {
                const path = this.clearPath(directoryPath, entry.name);

                if (entry.isDirectory()) {
                    filesPaths.push(...(await this.getFilesRecursively(path)));
                } else {
                    filesPaths.push(path);
                }
            }

            return filesPaths;
        }
    }
}
