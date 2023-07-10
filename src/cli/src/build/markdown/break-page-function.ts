import { ServiceProvider } from "../../infrastructure/service-provider.js";
import { FileSystem } from "../../infrastructure/file-system.js";
import { MarkdownBuild } from "../markdown.js";

const functionName = "breakpage";

export namespace BreakPageFunction {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        MarkdownBuild.registerFunctionExecutor(
            serviceProvider,
            () => new FunctionExecutor(serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );
    }

    export class FunctionExecutor implements MarkdownBuild.IFunctionExecutor {
        functionName: string = functionName;

        public constructor(private fileSystem: FileSystem.IFileSystem) {}

        async execute(executionContext: MarkdownBuild.FunctionExecutionContext): Promise<string> {
            return `<div style="page-break-after: always"></div>`;
        }
    }
}
