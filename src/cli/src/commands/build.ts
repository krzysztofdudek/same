import { ServiceProvider } from "../infrastructure/service-provider.js";
import { ICommand as ICommandCore } from "../core/command.js";
import { Manifest } from "../core/manifest.js";
import { Toolset } from "../core/toolset.js";
import { Build } from "../core/build.js";
import { PlantUml } from "../tools/plant-uml.js";

export namespace BuildCommand {
    export const iCommandServiceKey = "BuildCommand.ICommand";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(
            iCommandServiceKey,
            () =>
                new Command(
                    serviceProvider.resolve(Manifest.iOptionsServiceKey),
                    serviceProvider.resolve(Toolset.iOptionsServiceKey),
                    serviceProvider.resolve(Build.iOptionsServiceKey),
                    serviceProvider.resolve(PlantUml.iOptionsServiceKey),
                    serviceProvider.resolve(Toolset.iToolsetServiceKey),
                    serviceProvider.resolve(PlantUml.iServerServiceKey),
                    serviceProvider.resolve(Build.iBuilderServiceKey),
                    serviceProvider.resolve(Build.iContextServiceKey)
                )
        );
    }

    export interface IOptions {
        outputType: string;
        hostName: string;
        hostPort: number;
        hostProtocol: string;
        plantUmlServerPort: number;
        workingDirectoryPath: string;
        sourceDirectoryPath: string;
        outputDirectoryPath: string;
        toolsDirectoryPath: string;
    }

    export interface ICommand extends ICommandCore<IOptions> {}

    export class Command implements ICommand {
        public constructor(
            private manifestOptions: Manifest.IOptions,
            private toolsOptions: Toolset.IOptions,
            private buildOptions: Build.IOptions,
            private plantUmlOptions: PlantUml.IOptions,
            private toolset: Toolset.IToolset,
            private plantUmlServer: PlantUml.IServer,
            private builder: Build.IBuilder,
            private context: Build.IContext
        ) {}

        async execute(options: IOptions): Promise<void> {
            this.manifestOptions.workingDirectory = options.workingDirectoryPath;
            this.toolsOptions.toolsDirectoryPath = options.toolsDirectoryPath;
            this.buildOptions.sourceDirectoryPath = options.sourceDirectoryPath;
            this.buildOptions.outputDirectoryPath = options.outputDirectoryPath;
            this.buildOptions.outputType = options.outputType;
            this.plantUmlOptions.serverPort = options.plantUmlServerPort;

            try {
                await this.toolset.configure();
            } catch {
                return;
            }

            this.plantUmlServer.start();

            try {
                await this.context.analyzeCompletely();
                await this.builder.build();
            } finally {
                this.plantUmlServer.stop();
            }
        }
    }
}
