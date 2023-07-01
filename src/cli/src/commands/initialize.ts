import { Manifest } from "../core/manifest.js";
import { Toolset } from "../core/toolset.js";
import { ICommand as ICommandCore } from "../core/command.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { FileSystem } from "../infrastructure/file-system.js";

const vsCodeTasksFileContext = `{
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

const vsCodeSettingsFileContent = `{
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

const vsCodeExtensionsFileContent = `{
  "recommendations": [
    "streetsidesoftware.code-spell-checker",
    "alexkrechik.cucumberautocomplete",
    "EditorConfig.EditorConfig",
    "ms-vsliveshare.vsliveshare",
    "yzhang.markdown-all-in-one",
    "jebbs.plantuml",
    "systemticks.c4-dsl-extension",
    "Gruntfuggly.todo-tree",
    "DavidAnson.vscode-markdownlint",
    "Arjun.swagger-viewer"
  ]
}
`;

const markdownlintFileContent = `{
  "single-trailing-newline": false,
  "no-bare-urls": false,
  "line-length": false,
  "MD033": false,
  "MD041": false,
  "MD029": false,
  "MD025": false
}
`;

const gitIgnoreFileContent = `_tools
_generated
_temp`;

const gitAttributesFileContent = `*.sh            text eol=lf
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

const editorConfigFileContent = `root = true

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

export namespace InitializeCommand {
    export const iCommandServiceKey = "InitializeCommand.ICommand";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iCommandServiceKey,
            () =>
                new Command(
                    serviceProvider.resolve(Manifest.iOptionsServiceKey),
                    serviceProvider.resolve(Toolset.iOptionsServiceKey),
                    serviceProvider.resolve(Toolset.iToolsetServiceKey),
                    serviceProvider.resolve(Manifest.iRepositoryServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey)
                )
        );
    }

    export interface IOptions {
        name: string;
        workingDirectoryPath: string;
        sourceDirectoryPath: string;
        toolsDirectoryPath: string;
    }

    export interface ICommand extends ICommandCore<IOptions> {}

    export class Command implements ICommand {
        public constructor(
            private manifestOptions: Manifest.IOptions,
            private toolsOptions: Toolset.IOptions,
            private toolset: Toolset.IToolset,
            private manifestRepository: Manifest.IRepository,
            private fileSystem: FileSystem.IFileSystem
        ) {}

        async execute(options: IOptions): Promise<void> {
            this.manifestOptions.workingDirectory = options.workingDirectoryPath;
            this.toolsOptions.toolsDirectoryPath = options.toolsDirectoryPath;

            try {
                await this.toolset.configure();
            } catch {
                return;
            }

            await this.fileSystem.createDirectory(options.sourceDirectoryPath);
            await this.setupManifestFile(options.name);
            await this.createVsCodeTasks(options.workingDirectoryPath);
            await this.createVsCodeExtensions(options.workingDirectoryPath);
            await this.createVsCodeSettings(options.workingDirectoryPath);
            await this.createEditorConfig(options.workingDirectoryPath);
            await this.createGitAttributes(options.workingDirectoryPath);
            await this.createGitIgnore(options.workingDirectoryPath);
            await this.createMarkdownLint(options.workingDirectoryPath);
        }

        private async setupManifestFile(name: string) {
            let manifest: Manifest.Manifest;

            if (await this.manifestRepository.checkIfExists()) {
                manifest = <Manifest.Manifest>await this.manifestRepository.load();
            } else {
                manifest = Manifest.Manifest.empty();
                manifest.name = name;

                await this.manifestRepository.save(manifest);
            }
        }

        private async createVsCodeTasks(workingDirectoryPath: string) {
            const directoryPath = this.fileSystem.clearPath(workingDirectoryPath, ".vscode");

            await this.fileSystem.createDirectory(directoryPath);

            const filePath = this.fileSystem.clearPath(directoryPath, "tasks.json");

            await this.fileSystem.createFileIfNotExists(filePath, vsCodeTasksFileContext);
        }

        private async createVsCodeSettings(workingDirectoryPath: string) {
            const directoryPath = this.fileSystem.clearPath(workingDirectoryPath, ".vscode");

            await this.fileSystem.createDirectory(directoryPath);

            const filePath = this.fileSystem.clearPath(directoryPath, "settings.json");

            await this.fileSystem.createFileIfNotExists(filePath, vsCodeSettingsFileContent);
        }

        private async createVsCodeExtensions(workingDirectoryPath: string) {
            const directoryPath = this.fileSystem.clearPath(workingDirectoryPath, ".vscode");

            await this.fileSystem.createDirectory(directoryPath);

            const filePath = this.fileSystem.clearPath(directoryPath, "extensions.json");

            await this.fileSystem.createFileIfNotExists(filePath, vsCodeExtensionsFileContent);
        }

        private async createMarkdownLint(workingDirectoryPath: string) {
            const filePath = this.fileSystem.clearPath(workingDirectoryPath, ".markdownlint.json");

            await this.fileSystem.createFileIfNotExists(filePath, markdownlintFileContent);
        }

        private async createGitIgnore(workingDirectoryPath: string) {
            const filePath = this.fileSystem.clearPath(workingDirectoryPath, ".gitignore");

            await this.fileSystem.createFileIfNotExists(filePath, gitIgnoreFileContent);
        }

        private async createGitAttributes(workingDirectoryPath: string) {
            const filePath = this.fileSystem.clearPath(workingDirectoryPath, ".gitattributes");

            await this.fileSystem.createFileIfNotExists(filePath, gitAttributesFileContent);
        }

        private async createEditorConfig(workingDirectoryPath: string) {
            const filePath = this.fileSystem.clearPath(workingDirectoryPath, ".editorconfig");

            await this.fileSystem.createFileIfNotExists(filePath, editorConfigFileContent);
        }
    }
}
