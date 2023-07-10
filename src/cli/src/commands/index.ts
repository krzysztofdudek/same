import { ServiceProvider } from "../infrastructure/service-provider.js";
import { PublishCommand } from "./publish.js";
import { InitializeCommand } from "./initialize.js";
import { ServeCommand } from "./serve.js";

export namespace Commands {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        InitializeCommand.register(serviceProvider);
        PublishCommand.register(serviceProvider);
        ServeCommand.register(serviceProvider);
    }
}
