import { ServiceProvider } from "../infrastructure/service-provider.js";
import { Build } from "./build.js";
import { GitHub } from "./github.js";
import { Manifest } from "./manifest.js";
import { Toolset } from "./toolset.js";

export namespace Core {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        GitHub.register(serviceProvider);
        Manifest.register(serviceProvider);
        Toolset.register(serviceProvider);
        Build.register(serviceProvider);
    }
}
