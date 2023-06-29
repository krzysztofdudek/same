import { Awaiter } from "./awaiter.js";
import { Logger } from "./logger.js";
import { FileSystem } from "./file-system.js";
import { ServiceProvider } from "./service-provider.js";
import { Shell } from "./shell.js";
import { HttpClient } from "./http-client.js";

export namespace Infrastructure {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Awaiter.register(serviceProvider);
        FileSystem.register(serviceProvider);
        Logger.register(serviceProvider);
        Shell.register(serviceProvider);
        HttpClient.register(serviceProvider);
    }
}
