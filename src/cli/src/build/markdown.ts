import { Build } from "../core/build.js";
import { ServiceProvider } from "../infrastructure/service-provider.js";
import { FileSystem } from "../infrastructure/file-system.js";
import { LinksAnalyzer } from "./markdown/links-analyzer.js";
import { FileBuilder } from "./markdown/file-builder.js";
import { CodeFunction } from "./markdown/code-function.js";
import { ImportFunction } from "./markdown/import-function.js";
import { UnknownFunctionsAnalyzer } from "./markdown/unknown-functions-analyzer.js";
import { PlantUmlFunction } from "./markdown/plantuml-function.js";

export namespace MarkdownBuild {
    export const iFunctionExecutorServiceKey = "MarkdownBuild.IFunctionExecutor";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileAnalyzer(
            serviceProvider,
            () => new LinksAnalyzer(serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );

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
                    serviceProvider.resolveMany<IFunctionExecutor>(iFunctionExecutorServiceKey)
                )
        );

        CodeFunction.register(serviceProvider);
        ImportFunction.register(serviceProvider);
        PlantUmlFunction.register(serviceProvider);
    }

    export function registerFunctionExecutor(
        serviceProvider: ServiceProvider.IServiceProvider,
        factory: () => IFunctionExecutor
    ) {
        serviceProvider.registerSingleton(iFunctionExecutorServiceKey, factory);
    }

    export class FunctionExecutionContext {
        public constructor(
            private _parameters: string[],
            private _filePath: string,
            private _relativeFilePath: string
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
    }

    export interface IFunctionExecutor {
        functionName: string;

        execute(executionContext: FunctionExecutionContext): Promise<string>;
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

    export async function handleAllMatches(
        content: string,
        regExp: RegExp,
        handle: (match: RegExpMatchArray, line: number, column: number) => Promise<void>
    ) {
        const matches = matchAll(content, regExp);

        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];

            const fragment = content.substring(0, match.index);
            const line = (fragment.match(/\n/g)?.length ?? 0) + 1;
            const column = fragment.length - fragment.lastIndexOf("\n");

            await handle(match, line, column);
        }
    }

    export function matchAll(content: string, regExp: RegExp): RegExpMatchArray[] {
        const matchesIterator = content.matchAll(regExp);
        let match: IteratorResult<RegExpMatchArray, any>;
        const matches: RegExpMatchArray[] = [];

        while ((match = matchesIterator.next()).done !== true) {
            matches.push(match.value);
        }

        return matches;
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
