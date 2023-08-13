import yaml from "js-yaml";

export function getObject(fileContent: string, fileExtension: string): any {
    let object: any;

    if (fileExtension === "json") {
        object = JSON.parse(fileContent);
    }
    if (fileExtension === "yaml") {
        object = yaml.load(fileContent);
    }

    return object;
}
