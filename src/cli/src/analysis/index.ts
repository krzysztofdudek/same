import { ServiceProvider } from "../infrastructure/service-provider";

export namespace Analysis {
    export const iOptionsServiceKey = "Analysis.IOptions";
    export const iFileAnalyzerServiceKey = "Analysis.IFileAnalyzer";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iOptionsServiceKey,
            () =>
                <IOptions>{
                    sourceDirectoryPath: "",
                }
        );

        serviceProvider.registerSingleton(Analysis.iFileAnalyzerServiceKey, () => new Analysis.FileAnalyzer());
    }

    export interface IOptions {
        sourceDirectoryPath: string;
    }

    export interface IFileAnalyzer {}

    export class FileAnalyzer implements IFileAnalyzer {}
}
