import { ServiceProvider } from "../infrastructure/service-provider.js";
import { StructurizrBuild } from "./structurizr.js";

export namespace Build {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        StructurizrBuild.register(serviceProvider);
    }
}
