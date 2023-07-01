import { ServiceProvider } from "../infrastructure/service-provider.js";
import { BuildCommand } from "./build.js";
import { InitializeCommand } from "./initialize.js";

export namespace Commands {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        InitializeCommand.register(serviceProvider);
        BuildCommand.register(serviceProvider);
    }
}
