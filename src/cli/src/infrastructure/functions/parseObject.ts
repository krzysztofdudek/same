import yaml from "js-yaml";

export enum ObjectType {
    Json,
    Yaml,
}

export function parseObject(content: string, type: ObjectType): any {
    if (type === ObjectType.Json) {
        return JSON.parse(content);
    } else if (type === ObjectType.Yaml) {
        return yaml.load(content);
    }

    throw new Error("Unknown object type.");
}

export function stringifyObject(object: any, type: ObjectType): string {
    if (type === ObjectType.Json) {
        return JSON.stringify(object);
    } else if (type === ObjectType.Yaml) {
        return yaml.dump(object);
    }

    throw new Error("Unknown object type.");
}
