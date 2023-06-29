import { ServiceProvider } from "../infrastructure/service-provider.js";
import { InitializeCommand } from "./initialize.js";

export namespace Commands {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        InitializeCommand.register(serviceProvider);
    }
}
