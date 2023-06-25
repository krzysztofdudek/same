import { Awaiter } from "./awaiter";
import { Logger } from "./logger";
import { FileSystem } from "./file-system";
import { ServiceProvider } from "./service-provider";
import { Shell } from "./shell";
import { HttpClient } from "./http-client";

export namespace Infrastructure {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Awaiter.register(serviceProvider);
        FileSystem.register(serviceProvider);
        Logger.register(serviceProvider);
        Shell.register(serviceProvider);
        HttpClient.register(serviceProvider);
    }
}
