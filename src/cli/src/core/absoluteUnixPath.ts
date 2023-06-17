import { resolve, join } from 'path';

export default function absoluteUnixPath(...paths: string[]) {
    return resolve(join(...paths)).replaceAll(/\\/g, '/');
}