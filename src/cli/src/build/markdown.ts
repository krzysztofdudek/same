import { Build } from "../core/build.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { FileDependencyIntrospector } from "./markdown/FileDependencyIntrospector.js";
import { FunctionsAnalyzer } from "./markdown/FunctionsAnalyzer.js";
import { LinksAnalyzer } from "./markdown/LinksAnalyzer.js";
import { FileBuilder, IFunctionHandler, IFunctionHandlerServiceKey } from "./markdown/FileBuilder.js";

export namespace MarkdownBuild {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileDependencyIntrospector(
            serviceProvider,
            () => new FileDependencyIntrospector(serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );

        Build.registerFileAnalyzer(serviceProvider, () => new FunctionsAnalyzer());
        Build.registerFileAnalyzer(
            serviceProvider,
            () => new LinksAnalyzer(serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );

        Build.registerFileBuilder(
            serviceProvider,
            () =>
                new FileBuilder(
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey),
                    serviceProvider.resolveMany<IFunctionHandler>(IFunctionHandlerServiceKey)
                )
        );
    }
}
