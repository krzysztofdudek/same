import { ServiceProvider } from "../infrastructure/service-provider";
import { Graphviz } from "./graphviz";
import { Itself } from "./itself";
import { Java } from "./java";
import { PlantUml } from "./plant-uml";
import { Structurizr } from "./structurizr";

export namespace Tools {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Graphviz.register(serviceProvider);
        Itself.register(serviceProvider);
        Java.register(serviceProvider);
        PlantUml.register(serviceProvider);
        Structurizr.register(serviceProvider);
    }
}
