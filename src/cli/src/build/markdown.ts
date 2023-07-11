import { Build } from "../core/build.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { Link } from "./markdown/link.js";
import { FileBuilder } from "./markdown/file-builder.js";
import { CodeFunction } from "./markdown/code-function.js";
import { ImportFunction } from "./markdown/import-function.js";
import { UnknownFunctionsAnalyzer } from "./markdown/unknown-functions-analyzer.js";
import { PlantUmlFunction } from "./markdown/plantuml-function.js";
import { StructurizrFunction } from "./markdown/structurizr-function.js";
import { MarkdownFunction } from "./markdown/markdown-function.js";
import { SwaggerFunction } from "./markdown/swagger-function.js";
import { BuildExtension } from "./markdown/build-extension.js";
import { Publish } from "../publish/publish-static-files.js";
import { Manifest } from "../core/manifest.js";
import { handleAllMatches, matchAll } from "../core/regExp.js";
import { BreakPageFunction } from "./markdown/break-page-function.js";
import { ImageFunction } from "./markdown/image-function.js";

export namespace MarkdownBuild {
    export const iFunctionExecutorServiceKey = "MarkdownBuild.IFunctionExecutor";
    export const iPostProcessorServiceKey = "MarkdownBuild.IPostProcessor";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileAnalyzer(
            serviceProvider,
            () =>
                new UnknownFunctionsAnalyzer(
                    serviceProvider.resolveMany<IFunctionExecutor>(iFunctionExecutorServiceKey)
                )
        );

        Build.registerFileBuilder(
            serviceProvider,
            () =>
                new FileBuilder(
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey),
                    serviceProvider.resolveMany<IFunctionExecutor>(iFunctionExecutorServiceKey),
                    serviceProvider.resolveMany<IPostProcessor>(iPostProcessorServiceKey)
                )
        );

        Build.registerBuildExtension(
            serviceProvider,
            () =>
                new BuildExtension(
                    serviceProvider.resolve(Publish.iOptionsServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey),
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(Manifest.iRepositoryServiceKey)
                )
        );

        Link.register(serviceProvider);
        CodeFunction.register(serviceProvider);
        ImportFunction.register(serviceProvider);
        PlantUmlFunction.register(serviceProvider);
        StructurizrFunction.register(serviceProvider);
        MarkdownFunction.register(serviceProvider);
        SwaggerFunction.register(serviceProvider);
        BreakPageFunction.register(serviceProvider);
        ImageFunction.register(serviceProvider);
    }

    export function registerFunctionExecutor(
        serviceProvider: ServiceProvider.IServiceProvider,
        factory: () => IFunctionExecutor
    ) {
        serviceProvider.registerSingleton(iFunctionExecutorServiceKey, factory);
    }

    export function registerPostProcessor(
        serviceProvider: ServiceProvider.IServiceProvider,
        factory: () => IPostProcessor
    ) {
        serviceProvider.registerSingleton(iPostProcessorServiceKey, factory);
    }

    export class FunctionExecutionContext {
        public constructor(
            private _parameters: string[],
            private _filePath: string,
            private _relativeFilePath: string,
            private _fileExtension: string
        ) {}

        public get parameters() {
            return [...this._parameters];
        }

        public get filePath() {
            return this._filePath;
        }

        public get relativeFilePath() {
            return this._relativeFilePath;
        }

        public get fileExtension() {
            return this._fileExtension;
        }
    }

    export interface IFunctionExecutor {
        functionName: string;

        execute(executionContext: FunctionExecutionContext): Promise<string>;
    }

    export interface IPostProcessor {
        execute(chunks: string[], context: Build.FileBuildContext): Promise<void>;
    }

    const functionRegExp = /@(\w+)\((.*)\)/g;

    export async function handleFunctions(
        content: string,
        handle: (functionName: string, parameters: string[], line?: number, column?: number) => Promise<void>
    ): Promise<void> {
        await handleAllMatches(content, functionRegExp, async (match, line, column) => {
            const { functionName, parameters } = processMatchedFunction(match);

            await handle(functionName, parameters, line, column);
        });
    }

    interface IFunctionMatch {
        match: RegExpMatchArray;
        functionName: string;
        parameters: string[];
        line: number;
        column: number;
    }

    export function matchAllFunctions(content: string): IFunctionMatch[] {
        const matches = matchAll(content, functionRegExp);
        const result: IFunctionMatch[] = [];

        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const { functionName, parameters } = processMatchedFunction(match);
            const fragment = content.substring(0, match.index);
            const line = (fragment.match(/\n/g)?.length ?? 0) + 1;
            const column = fragment.length - fragment.lastIndexOf("\n");

            result.push({
                match,
                functionName,
                parameters,
                line,
                column,
            });
        }

        return result;
    }

    function processMatchedFunction(match: RegExpMatchArray): {
        functionName: string;
        parameters: string[];
    } {
        const functionName = match[1];
        const parameters = match[2].split(",").map((x) => x.trim());

        return { functionName, parameters };
    }
}
