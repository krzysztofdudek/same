import path from "path";
import { createDirectoryIfNotExists, iterateOverFilesInDirectory } from "../core/file-system.js";
import fs from 'fs';
import fsPromises from 'fs/promises';
import MarkdownIt from 'markdown-it';

export namespace MarkdownTransformation {
    export interface Options {
        hostName: string;
        hostPort: number;
        hostProtocol: string;
        workingDirectoryPath: string;
        outputDirectoryPath: string;
        toolsDirectoryPath: string;
        plantUmlToSvg: (content: string) => Promise<string>;
        name: string;
    }

    export async function transformAllFiles(options: Options) {
        console.debug('Transforming Markdown files.');

        await iterateOverFilesInDirectory(options.workingDirectoryPath, ['md'], async filePath => {
            await transformSingleFile(filePath, options);
        });

        console.debug('Markdown files transformed.');
    }

    export async function transformSingleFile(filePath: string, options: Options) {
        console.debug(`Transforming: ${filePath}`);

        const outputFilePath = path.join(options.outputDirectoryPath, filePath.replace(options.workingDirectoryPath, '').replace('.md', '.html'));
        const outputDirectoryPath = path.dirname(outputFilePath);

        await createDirectoryIfNotExists(outputDirectoryPath);
        await createHtmlFile(filePath, outputFilePath, options)

        console.debug(`Transformed: ${filePath}`);
    }
}

const md = new MarkdownIt({
    html: true
});

async function createHtmlFile(markdownFilePath: string, outputFilePath: string, options: MarkdownTransformation.Options) {
    let fileContent = await processMarkdownFile(markdownFilePath, options);

    const render = md.render(fileContent);

    fs.writeFileSync(outputFilePath.replace('.html', '.fragment.html'), render, {
        encoding: 'utf-8'
    });

    const extension = path.extname(markdownFilePath);
    let pathFragments = markdownFilePath.substring(0, markdownFilePath.length - extension.length).replace(options.workingDirectoryPath, '').substring(1).replaceAll(/\\/g, '/').split('/');

    if (pathFragments[pathFragments.length - 1] === 'index')
        pathFragments = pathFragments.slice(0, pathFragments.length - 1);

    pathFragments = pathFragments.map(x => x.split('-').map(x => x.charAt(0).toUpperCase() + x.slice(1)).join(' '));

    const header = [options.name, ...pathFragments].join(' > ');

    let html = `<html lang="en">
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="stylesheet" href="${options.hostProtocol}://${options.hostName}:${options.hostPort}/styles.css">
            <title>${options.name}</title>
            <style>
                body {
                    padding: 1em;
                }
            </style>
            <script src="${options.hostProtocol}://${options.hostName}:${options.hostPort}/script.js" type="text/javascript"></script>
        </head>
        <body class="markdown-body">
            ${render.indexOf('h1') < 0 ? `<h1>${header}</h1>` : ''}
${render}
        </body>
    </html>`;

    html = html.replace(/(href=\".+).md\"/mg, "$1.html\"");

    await fsPromises.writeFile(outputFilePath, html, {
        encoding: 'utf-8'
    });
}

async function breakLines(fileContent: string) {
    const matchesIterator = fileContent.matchAll(/!{3}\s*break-page\s*!{3}/gi);
    let match;

    while (match = matchesIterator.next()) {
        const value = match.value;

        if (value === undefined) {
            break;
        }

        const wholeMatch = value[0];

        fileContent = fileContent.replace(wholeMatch, '<div style="page-break-after: always"></div>');
    }

    return fileContent;
}

async function importGherkinFiles(filePath: string, fileContent: string, options: MarkdownTransformation.Options) {
    let result = fileContent;

    const matchesIterator = result.matchAll(/!{3}\s*gherkin\s*\(\s*(@)?(.+)\s*\)\s*!{3}/gi);
    let match;

    while (match = matchesIterator.next()) {
        const value = match.value;

        if (value === undefined) {
            break;
        }

        const wholeMatch = value[0];
        const isAbsolutePath = value[1] === '@';
        const fileName = value[2];
        const plantUmlFilePath = isAbsolutePath ? fileName : path.resolve(`${path.dirname(filePath)}/${fileName}`);

        const fileContent = await fsPromises.readFile(plantUmlFilePath, { encoding: 'utf-8' });

        const replacement =
`\`\`\`gherkin
${fileContent}
\`\`\``;

        result = result.replace(wholeMatch, replacement);
    }

    return result;
}

async function importPlantUmlFiles(filePath: string, fileContent: string, options: MarkdownTransformation.Options) {
    let result = fileContent;

    const matchesIterator = result.matchAll(/!{3}\s*plantuml\s*\(\s*(@)?(.+)\s*\)\s*!{3}/gi);
    let match;

    while (match = matchesIterator.next()) {
        const value = match.value;

        if (value === undefined) {
            break;
        }

        const wholeMatch = value[0];
        const isAbsolutePath = value[1] === '@';
        const fileName = value[2];
        const plantUmlFilePath = isAbsolutePath ? fileName : path.resolve(`${path.dirname(filePath)}/${fileName}`);

        const fileContent = await fsPromises.readFile(plantUmlFilePath, { encoding: 'utf-8' });

        const svg = await options.plantUmlToSvg(fileContent);

        result = result.replace(wholeMatch, svg);
    }

    return result;
}

async function importMarkdownFiles(filePath: string, fileContent: string, options: MarkdownTransformation.Options) {
    let result = fileContent;

    const matchesIterator = result.matchAll(/!{3}\s*markdown\s*\(\s*(.+)\s*\)\s*!{3}/gi);
    let match;

    while (match = matchesIterator.next()) {
        const value = match.value;

        if (value === undefined) {
            break;
        }

        const wholeMatch = value[0];
        const markdownFile = value[1];
        const markdownFilePath = path.resolve(`${path.dirname(filePath)}/${markdownFile}`);

        let fileContent = await processMarkdownFile(markdownFilePath, options);

        result = result.replace(wholeMatch, fileContent);
    }

    return result;
}

async function importStructurizrFiles(filePath: string, fileContent: string, options: MarkdownTransformation.Options) {
    let result = fileContent;

    const matchesIterator = result.matchAll(/!{3}\s*structurizr\s*\(\s*(.+)\s*,\s*(\w+)\s*,\s*(\d+)\s*\)\s*!{3}/gi);
    let match;

    function pad(num: string, size: number) {
        num = num.toString();
        while (num.length < size) num = "0" + num;
        return num;
    }

    while (match = matchesIterator.next()) {
        const value = match.value;

        if (value === undefined) {
            break;
        }

        const wholeMatch = value[0];
        const structurizrFile = value[1];
        const viewType = value[2];
        const viewNumber = value[3];

        const extension = path.extname(structurizrFile);
        const fileName = structurizrFile.substring(0, structurizrFile.length - extension.length);
        const directory = `${path.dirname(filePath).replace(options.workingDirectoryPath, '')}/${fileName}`.substring(1).replaceAll(/\\/g, '/');
        const replacement = `!!!plantuml(@${options.outputDirectoryPath}/diagrams/${directory}/structurizr-${viewType}-${pad(viewNumber, 3)}.puml)!!!`;

        result = result.replace(wholeMatch, replacement);
    }

    return result;
}

async function processMarkdownFile(filePath: string, options: MarkdownTransformation.Options) {
    let fileContent = await fsPromises.readFile(filePath, {
        encoding: 'utf-8'
    });

    fileContent = await importStructurizrFiles(filePath, fileContent, options);
    fileContent = await importPlantUmlFiles(filePath, fileContent, options);
    fileContent = await importGherkinFiles(filePath, fileContent, options);
    fileContent = await importMarkdownFiles(filePath, fileContent, options);
    fileContent = await breakLines(fileContent);

    return fileContent;
}