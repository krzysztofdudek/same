import { ServiceProvider } from "../infrastructure/service-provider";
import { GitHub } from "./github";
import { Manifest } from "./manifest";
import { Toolset } from "./toolset";

export namespace Core {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        GitHub.register(serviceProvider);
        Manifest.register(serviceProvider);
        Toolset.register(serviceProvider);
    }
}
