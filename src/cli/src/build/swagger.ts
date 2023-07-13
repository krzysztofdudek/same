import { Build } from "../core/build.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { getObject } from "../infrastructure/functions/getObject.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import swagger from "swagger-ui-express";
import { Publish } from "../publish/publish-static-files.js";

const swaggerInitJsFileContent = `
window.onload = function() {
    // Build a system
    var url = window.location.search.match(/url=([^&]+)/);
    if (url && url.length > 1) {
      url = decodeURIComponent(url[1]);
    } else {
      url = window.location.origin;
    }
    var options = { "swaggerDoc": <<<swagger>>>,
    "customOptions": {}
  };
    url = options.swaggerUrl || url
    var urls = options.swaggerUrls
    var customOptions = options.customOptions
    var spec1 = options.swaggerDoc
    var swaggerOptions = {
      spec: spec1,
      url: url,
      urls: urls,
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset
      ],
      plugins: [
        SwaggerUIBundle.plugins.DownloadUrl
      ],
      layout: "StandaloneLayout"
    }
    for (var attrname in customOptions) {
      swaggerOptions[attrname] = customOptions[attrname];
    }
    var ui = SwaggerUIBundle(swaggerOptions)

    if (customOptions.oauth) {
      ui.initOAuth(customOptions.oauth)
    }

    if (customOptions.preauthorizeApiKey) {
      const key = customOptions.preauthorizeApiKey.authDefinitionKey;
      const value = customOptions.preauthorizeApiKey.apiKeyValue;
      if (!!key && !!value) {
        const pid = setInterval(() => {
          const authorized = ui.preauthorizeApiKey(key, value);
          if(!!authorized) clearInterval(pid);
        }, 500)

      }
    }

    if (customOptions.authAction) {
      ui.authActions.authorize(customOptions.authAction)
    }

    window.ui = ui
  }`;

export namespace SwaggerBuild {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileBuilder(
            serviceProvider,
            () =>
                new FileBuilder(
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey),
                    serviceProvider.resolve(Publish.iOptionsServiceKey)
                )
        );

        Build.registerBuildExtension(
            serviceProvider,
            () =>
                new BuildExtension(
                    serviceProvider.resolve(Publish.iOptionsServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey)
                )
        );
    }

    export class FileBuilder implements Build.IFileBuilder {
        fileExtensions: string[] = ["json", "yaml", "yml"];
        outputType: string = "html";

        public constructor(
            private fileSystem: FileSystem.IFileSystem,
            private buildOptions: Build.IOptions,
            private publishOptions: Publish.IOptions
        ) {}

        async build(context: Build.FileBuildContext): Promise<void> {
            const fileContent = await this.fileSystem.readFile(context.path);

            const object = getObject(fileContent, context.extension);

            if (!checkIfObjectIsSpecification(object)) {
                return;
            }

            let render = swagger.generateHTML(object);

            const baseUrl = this.publishOptions.createBaseUrl();
            const fileName = this.fileSystem.getName(context.path);

            render = render.replace("./swagger-ui.css", `${baseUrl}/swagger-ui.css`);
            render = render.replace("./swagger-ui-bundle.js", `${baseUrl}/swagger-ui-bundle.js`);
            render = render.replace("./swagger-ui-standalone-preset.js", `${baseUrl}/swagger-ui-standalone-preset.js`);
            render = render.replace(
                "./swagger-ui-init.js",
                `./${fileName.substring(0, fileName.length - context.extension.length)}js`
            );

            const outputFilePath = this.fileSystem.clearPath(
                this.buildOptions.outputDirectoryPath,
                context.relativePath.substring(0, context.relativePath.length - context.extension.length)
            );

            await this.fileSystem.createOrOverwriteFile(outputFilePath + "html", render);

            const swaggerInitJsFileContentSpecified = swaggerInitJsFileContent.replace(
                "<<<swagger>>>",
                JSON.stringify(object)
            );

            await this.fileSystem.createOrOverwriteFile(outputFilePath + "js", swaggerInitJsFileContentSpecified);
        }
    }

    export class BuildExtension implements Build.IBuildExtension {
        outputType: string = "html";

        public constructor(
            private publishOptions: Publish.IOptions,
            private buildOptions: Build.IOptions,
            private fileSystem: FileSystem.IFileSystem
        ) {}

        async onBuildStarted(): Promise<void> {}

        async onFileBuilt(file: Build.AnalyzedFile): Promise<void> {
            if (["json", "yaml", "yml"].indexOf(file.extension) === -1) {
                return;
            }

            const sourceFileContent = await this.fileSystem.readFile(file.path);
            const object = getObject(sourceFileContent, file.extension);

            if (!checkIfObjectIsSpecification(object)) {
                return;
            }

            const publishSpecificationFilePath = this.fileSystem.clearPath(
                this.publishOptions.outputDirectoryPath,
                file.compactPath
            );

            const fileCompactPath = `${file.compactPath.substring(0, file.compactPath.length - file.extension.length)}`;
            const htmlFileCompactPath = `${fileCompactPath}html`;
            const jsFileCompactPath = `${fileCompactPath}js`;

            const builtHtmlFilePath = this.fileSystem.clearPath(
                this.buildOptions.outputDirectoryPath,
                htmlFileCompactPath
            );
            const publishHtmlFilePath = this.fileSystem.clearPath(
                this.publishOptions.outputDirectoryPath,
                htmlFileCompactPath
            );

            const builtJsFilePath = this.fileSystem.clearPath(this.buildOptions.outputDirectoryPath, jsFileCompactPath);
            const publishJsFilePath = this.fileSystem.clearPath(
                this.publishOptions.outputDirectoryPath,
                jsFileCompactPath
            );

            const publishDirectoryPath = this.fileSystem.getDirectory(publishHtmlFilePath);

            await this.fileSystem.createDirectory(publishDirectoryPath);

            await this.fileSystem.copy(file.path, publishSpecificationFilePath);

            let htmlFileContent = await this.fileSystem.readFile(builtHtmlFilePath);
            htmlFileContent = htmlFileContent.replace(
                "</head>",
                `<script src="${this.publishOptions.createBaseUrl()}/script.js" type="text/javascript"></script></head>`
            );

            await this.fileSystem.createOrOverwriteFile(publishHtmlFilePath, htmlFileContent);

            await this.fileSystem.copy(builtJsFilePath, publishJsFilePath);
        }
    }

    export function checkIfObjectIsSpecification(object: any): boolean {
        return object.swagger || object.openapi;
    }
}
