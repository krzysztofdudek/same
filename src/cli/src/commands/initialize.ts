import chalk from "chalk";
import path from "path";
import fs from 'fs';
import fsPromises from 'fs/promises';
import { Java } from "../tools/java.js";
import { PlantUml } from "../tools/plant-uml.js";
import { Structurizr } from "../tools/structurizr.js";
import { createDirectoryIfNotExists } from "../core/file-system.js";
import { Graphviz } from "../tools/graphviz.js";
import { Itself } from "../tools/itself.js";

export interface Options {
    name: string;
    workingDirectoryPath: string;
    sourceDirectoryPath: string;
    toolsDirectoryPath: string;
}

export async function exec(options: Options) {
    await Itself.check();
    await Java.check();
    await Graphviz.check();

    console.log(chalk.greenBright('Started initialization.'));

    await PlantUml.configure(options.toolsDirectoryPath);
    await Structurizr.configure(options.toolsDirectoryPath);

    await setupManifestFile(options.workingDirectoryPath, options.name);
    await createVsCodeTasks(options.workingDirectoryPath);
    await createVsCodeExtensions(options.workingDirectoryPath);
    await createVsCodeSettings(options.workingDirectoryPath)
    await createEditorConfig(options.workingDirectoryPath);
    await createGitAttributes(options.workingDirectoryPath);
    await createGitIgnore(options.workingDirectoryPath);
    await createMarkdownLint(options.workingDirectoryPath);

    console.log(chalk.greenBright('Initialization completed.'));
}

async function setupManifestFile(workingDirectoryPath: string, name: string) {
    const manifest = new ManifestFile(workingDirectoryPath);

    if (manifest.isSaved()) {
        await manifest.load()
    } else {
        manifest.name = name;

        await manifest.save();
    }
}

async function createVsCodeTasks(workingDirectoryPath: string) {
    const directoryPath = path.join(workingDirectoryPath, '.vscode');

    await createDirectoryIfNotExists(directoryPath);

    const filePath = path.join(directoryPath, 'tasks.json');

    const content =
`{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Serve Documentation",
      "type": "shell",
      "command": "samecli serve"
    }
  ]
}
`;

    await createFileIfNotExists(filePath, content);
}

async function createVsCodeSettings(workingDirectoryPath: string) {
    const directoryPath = path.join(workingDirectoryPath, '.vscode');

    await createDirectoryIfNotExists(directoryPath);

    const filePath = path.join(directoryPath, 'settings.json');

    const content =
`{
  "plantuml.render": "PlantUMLServer",
  "plantuml.server": "http://localhost:65100",
  "markdown.preview.scrollEditorWithPreview": false,
  "markdown.preview.scrollPreviewWithEditor": false,
  "html.validate.scripts": false,
  "todo-tree.regex.regexCaseSensitive": true,
  "todo-tree.general.tags": [
      "@todo",
      "@issue",
      "@question"
  ],
  "todo-tree.tree.showCountsInTree": true,
  "todo-tree.tree.groupedByTag": true,
  "todo-tree.general.statusBar": "tags",
  "extensions.ignoreRecommendations": false,
  "c4.diagram.plantuml.enabled": true
}`;

    await createFileIfNotExists(filePath, content);
}

async function createVsCodeExtensions(workingDirectoryPath: string) {
    const directoryPath = path.join(workingDirectoryPath, '.vscode');

    await createDirectoryIfNotExists(directoryPath);

    const filePath = path.join(directoryPath, 'extensions.json');

    const content =
`{
  "recommendations": [
    "streetsidesoftware.code-spell-checker",
    "alexkrechik.cucumberautocomplete",
    "EditorConfig.EditorConfig",
    "ms-vsliveshare.vsliveshare",
    "yzhang.markdown-all-in-one",
    "jebbs.plantuml",
    "systemticks.c4-dsl-extension",
    "Gruntfuggly.todo-tree",
    "DavidAnson.vscode-markdownlint"
  ]
}
`;

    await createFileIfNotExists(filePath, content);
}

async function createMarkdownLint(workingDirectoryPath: string) {
    const filePath = path.join(workingDirectoryPath, '.markdownlint.json');

    const content =
`{
  "single-trailing-newline": false,
  "no-bare-urls": false,
  "line-length": false,
  "MD033": false,
  "MD041": false,
  "MD029": false,
  "MD025": false
}
`;

    await createFileIfNotExists(filePath, content);
}

async function createGitIgnore(workingDirectoryPath: string) {
    const filePath = path.join(workingDirectoryPath, '.gitignore');

    const content =
`_tools
_generated
_temp`;

    await createFileIfNotExists(filePath, content);
}

async function createGitAttributes(workingDirectoryPath: string) {
    const filePath = path.join(workingDirectoryPath, '.gitattributes');

    const content =
`*.sh            text eol=lf
*.ps1           text eol=lf
*.json          text eol=lf
*.xml           text eol=lf
*.md            text eol=lf
*.txt           text eol=lf
*.sql           text eol=lf
*.yaml          text eol=lf
*.yml           text eol=lf
*.Dockerfile    text eol=lf
*.dsl           text eol=lf
*.js            text eol=lf
.gitattributes  text eol=lf
.gitignore      text eol=lf
.editorconfig   text eol=lf
.hintrc         text eol=lf
*.png           binary
*.jpg           binary
*.jpeg          binary
*.gif           binary`;

    await createFileIfNotExists(filePath, content);
}

async function createEditorConfig(workingDirectoryPath: string) {
    const filePath = path.join(workingDirectoryPath, '.editorconfig');

    const content =
`root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
tab_width = 2
trim_trailing_whitespace = true
max_line_length = off

[*.md]
trim_trailing_whitespace = false`;

    await createFileIfNotExists(filePath, content);
}

async function createFileIfNotExists(filePath: string, content: string) {
    if (fs.existsSync(filePath)) {
        return;
    }

    await fsPromises.writeFile(filePath, content, {
        'encoding': 'utf8'
    })

    console.debug(`Created ${path.basename(filePath)}.`);
}