import { ServiceProvider } from "../infrastructure/service-provider.js";
import { PlantUmlBuild } from "./plant-uml.js";
import { StructurizrBuild } from "./structurizr.js";

export namespace Build {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        StructurizrBuild.register(serviceProvider);
        PlantUmlBuild.register(serviceProvider);
    }
}
