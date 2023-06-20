import { IManifestRepository, ManifestRepository, Options as ManifestOptions } from "./core/manifest";
import { Toolset } from "./core/tool";
import { IFileSystem } from "./infrastructure/abstraction/file-system";
import { ILogger, ILoggerOptions, LogLevel } from "./infrastructure/abstraction/logger";
import { IShell } from "./infrastructure/abstraction/shell";
import { FileSystem } from "./infrastructure/implementation/file-system";
import { ConsoleLogger } from "./infrastructure/implementation/logger";
import { Shell } from "./infrastructure/implementation/shell";
import { Graphviz } from "./tools/graphviz";
import { Java } from "./tools/java";

export namespace Bootstrapper {
    let _loggerOptions: ILoggerOptions;
    export function loggerOptions(): ILoggerOptions {
        return _loggerOptions ?? (_loggerOptions = {
            minimalLogLevel: LogLevel.Information
        });
    }

    let _logger: ILogger;
    export function logger(): ILogger {
        return _logger ?? (_logger = new ConsoleLogger(_loggerOptions));
    }

    let _fileSystem: IFileSystem;
    export function fileSystem(): IFileSystem {
        return _fileSystem ?? (_fileSystem = new FileSystem());
    }

    let _shell: IShell;
    export function shell(): IShell {
        return _shell ?? (_shell = new Shell());
    }

    export function manifestRepository(options: ManifestOptions): IManifestRepository {
        return new ManifestRepository(_fileSystem, options, _logger);
    }

    let _toolset: Toolset;
    export function toolset() {
        return _toolset ?? (_toolset = new Toolset());
    }

    let _graphviz: Graphviz;
    export function graphviz(): Graphviz {
        return _graphviz ?? (_graphviz = new Graphviz(shell()));
    }

    let _java: Java;
    export function java(): Java {
        return _java ?? (_java = new Java(shell()));
    }
}