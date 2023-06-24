import { GitHub, IGitHub } from "./core/github";
import { IManifestRepository, ManifestRepository, IManifestOptions } from "./core/manifest";
import { IToolset, IToolsetVersions, Toolset, ToolsetVersions } from "./core/tool";
import { IAwaiter } from "./infrastructure/abstraction/awaiter";
import { IFileSystem } from "./infrastructure/abstraction/file-system";
import { IHttpClient } from "./infrastructure/abstraction/http-client";
import { ILoggerFactory, ILoggerOptions, LogLevel } from "./infrastructure/abstraction/logger";
import { IShell } from "./infrastructure/abstraction/shell";
import { Awaiter } from "./infrastructure/implementation/awaiter";
import { FileSystem } from "./infrastructure/implementation/file-system";
import { HttpClient } from "./infrastructure/implementation/http-client";
import { LoggerFactory } from "./infrastructure/implementation/logger";
import { ServiceProvider } from "./infrastructure/implementation/service-provider";
import { Shell } from "./infrastructure/implementation/shell";
import { Graphviz } from "./tools/graphviz";
import { Itself } from "./tools/itself";
import { Java } from "./tools/java";
import { PlantUml } from "./tools/plant-uml";
import { IToolsOptions } from "./tools/tools-options";

export namespace Bootstrapper {
    const serviceProvider = new ServiceProvider();

    let _awaiter: IAwaiter;
    export function awaiter(): IAwaiter {
        return _awaiter ?? (_awaiter =
            new Awaiter());
    }

    let _loggerOptions: ILoggerOptions;
    export function loggerOptions(): ILoggerOptions {
        return _loggerOptions ?? (_loggerOptions = {
            minimalLogLevel: LogLevel.Information
        });
    }

    let _loggerFactory: ILoggerFactory;
    export function loggerFactory(): ILoggerFactory {
        return _loggerFactory ?? (_loggerFactory =
            new LoggerFactory(loggerOptions()));
    }

    let _httpClient: IHttpClient;
    export function httpClient(): IHttpClient {
        return _httpClient ?? (_httpClient =
            new HttpClient(loggerFactory().create("HttpClient")));
    }

    let _fileSystem: IFileSystem;
    export function fileSystem(): IFileSystem {
        return _fileSystem ?? (_fileSystem =
            new FileSystem());
    }

    let _shell: IShell;
    export function shell(): IShell {
        return _shell ?? (_shell =
            new Shell());
    }

    let _manifestOptions: IManifestOptions;
    export function manifestOptions(): IManifestOptions {
        return _manifestOptions ?? (_manifestOptions = {
            workingDirectory: ''
        })
    }

    let _manifestRepository: IManifestRepository;
    export function manifestRepository(): IManifestRepository {
        return _manifestRepository ?? (_manifestRepository =
            new ManifestRepository(fileSystem(), manifestOptions(), loggerFactory().create('ManifestRepository')));
    }

    let _gitHub: IGitHub;
    export function gitHub(): IGitHub {
        return _gitHub ?? (_gitHub =
            new GitHub(httpClient(), loggerFactory().create('GitHub')));
    }

    let _toolsOptions: IToolsOptions;
    export function toolsOptions(): IToolsOptions {
        return _toolsOptions ?? (_toolsOptions = {
            toolsDirectoryPath: ''
        })
    }

    let _toolsetVersions: IToolsetVersions;
    export function toolsetVersions(): IToolsetVersions {
        return _toolsetVersions ?? (_toolsetVersions =
            new ToolsetVersions(fileSystem(), toolsOptions()));
    }

    Graphviz.register(serviceProvider);
    Java.register(serviceProvider);
    Itself.register(serviceProvider);
    PlantUml.register(serviceProvider);

    let _toolset: IToolset;
    export function toolset(): IToolset {
        return _toolset ?? (_toolset =
            new Toolset([
                graphviz(),
                java(),
                itself()
            ]));
    }
}