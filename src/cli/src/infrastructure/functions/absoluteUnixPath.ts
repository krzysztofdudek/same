import { resolve, join } from "path";

export default function absoluteUnixPath(...pathComponents: string[]): string {
    return resolve(join(...pathComponents)).replaceAll(/\\/g, "/");
}
