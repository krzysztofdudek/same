import { ServiceProvider } from "../infrastructure/service-provider.js";
import { MarkdownBuild } from "./markdown.js";
import { PlantUmlBuild } from "./plantuml.js";
import { StructurizrBuild } from "./structurizr.js";
import { SwaggerBuild } from "./swagger.js";

export namespace Build {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        StructurizrBuild.register(serviceProvider);
        PlantUmlBuild.register(serviceProvider);
        MarkdownBuild.register(serviceProvider);
        SwaggerBuild.register(serviceProvider);
    }
}
