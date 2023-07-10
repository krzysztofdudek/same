import { Build } from "../../core/build.js";
import { FileSystem } from "../../infrastructure/file-system.js";
import { getObject } from "../../infrastructure/functions/getObject.js";
import { ServiceProvider } from "../../infrastructure/service-provider.js";
import { MarkdownBuild } from "../markdown.js";
import { SwaggerBuild } from "../swagger.js";
import { parameterDependencyIntrospector } from "./parameter-dependency-introspector.js";

const functionName = "swagger";

export namespace SwaggerFunction {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Build.registerFileAnalyzer(
            serviceProvider,
            () =>
                new FileAnalyzer(
                    serviceProvider.resolve(FileSystem.iFileSystemServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey)
                )
        );

        Build.registerFileDependencyIntrospector(serviceProvider, () =>
            parameterDependencyIntrospector(functionName, 0, serviceProvider.resolve(FileSystem.iFileSystemServiceKey))
        );

        MarkdownBuild.registerFunctionExecutor(serviceProvider, () => new FunctionExecutor());
    }

    export class FileAnalyzer implements Build.IFileAnalyzer {
        fileExtensions: string[] = ["md"];

        public constructor(private fileSystem: FileSystem.IFileSystem, private buildOptions: Build.IOptions) {}

        async getAnalysisResults(
            path: string,
            _relativePath: string,
            content: string
        ): Promise<Build.AnalysisResult[]> {
            const analysisResults: Build.AnalysisResult[] = [];

            const functions = MarkdownBuild.matchAllFunctions(content);

            for (let i = 0; i < functions.length; i++) {
                const _function = functions[i];

                if (_function.functionName == functionName) {
                    if (_function.parameters.length === 0 || _function.parameters[0].length === 0) {
                        analysisResults.push(
                            new Build.AnalysisResult(
                                Build.AnalysisResultType.Error,
                                "Swagger function requires first parameter specifying file path.",
                                _function.line,
                                _function.column
                            )
                        );
                    }

                    const swaggerFilePath = this.fileSystem.clearPath(
                        this.buildOptions.sourceDirectoryPath,
                        this.fileSystem.getDirectory(path).substring(this.buildOptions.sourceDirectoryPath.length + 1),
                        _function.parameters[0]
                    );
                    const fileExtension = this.fileSystem.getExtension(swaggerFilePath);
                    const fileContent = await this.fileSystem.readFile(swaggerFilePath);

                    const object = getObject(fileContent, fileExtension);

                    if (!SwaggerBuild.checkIfObjectIsSpecification(object)) {
                        analysisResults.push(
                            new Build.AnalysisResult(
                                Build.AnalysisResultType.Error,
                                `"${_function.parameters[0]}" is not a valid swagger file.`
                            )
                        );
                    }
                }
            }

            return analysisResults;
        }
    }

    export class FunctionExecutor implements MarkdownBuild.IFunctionExecutor {
        functionName: string = functionName;

        async execute(executionContext: MarkdownBuild.FunctionExecutionContext): Promise<string> {
            const filePath = executionContext.parameters[0];
            const url = `${filePath.substring(0, filePath.lastIndexOf(".") + 1)}html`;

            return `[<a href="${url}">Link to Swagger UI</a>, <a href="${filePath}">Link to specification</a>]<br /><iframe src="${url}" style="width: 100%; height: 800px"></iframe>`;
        }
    }
}
