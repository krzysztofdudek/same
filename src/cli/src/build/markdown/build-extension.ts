import { FileSystem } from "../../infrastructure/file-system.js";
import { Build } from "../../core/build.js";
import { Manifest } from "../../core/manifest.js";
import { Publish } from "../../publish/publish-static-files.js";

export class BuildExtension implements Build.IBuildExtension {
    outputType: string = "html";

    public constructor(
        private publishOptions: Publish.IOptions,
        private buildOptions: Build.IOptions,
        private fileSystem: FileSystem.IFileSystem,
        private manifestRepository: Manifest.IRepository
    ) {}

    async onBuildStarted(): Promise<void> {}

    async onFileBuilt(file: Build.AnalyzedFile): Promise<void> {
        if (file.extension !== "md") {
            return;
        }

        const compactPath = `${file.compactPath.substring(0, file.compactPath.length - file.extension.length)}html`;

        const sourcePath = this.fileSystem.clearPath(this.buildOptions.outputDirectoryPath, compactPath);
        const outputPath = this.fileSystem.clearPath(this.publishOptions.outputDirectoryPath, compactPath);
        const outputDirectoryPath = this.fileSystem.getDirectory(outputPath);

        await this.fileSystem.createDirectory(outputDirectoryPath);

        let fileContent = await this.fileSystem.readFile(sourcePath);
        const manifest = <Manifest.Manifest>await this.manifestRepository.load();

        const fragments = file.compactPath
            .split("/")
            .map((x) => x.trim())
            .map((x) => (x.lastIndexOf(".") !== -1 ? x.substring(0, x.lastIndexOf(".")) : x))
            .filter((x) => x.length > 1 && x !== "index")
            .map((x) =>
                x
                    .split("-")
                    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
                    .join(" ")
            );

        const header = [manifest.name, ...fragments].join(" > ");

        fileContent = `<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="${this.publishOptions.createBaseUrl()}/styles.css">
    <title>${manifest.name}</title>
    <style>
        body {
            padding: 1em;
        }
    </style>
    <script src="${this.publishOptions.createBaseUrl()}/script.js" type="text/javascript"></script>
</head>
<body class="markdown-body">
    <h1>${header}</h1>
${fileContent}
</body>
</html>`;

        await this.fileSystem.createOrOverwriteFile(outputPath, fileContent);
    }
}
