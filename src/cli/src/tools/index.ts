import { ServiceProvider } from "../infrastructure/service-provider.js";
import { Graphviz } from "./graphviz.js";
import { Itself } from "./itself.js";
import { Java } from "./java.js";
import { PlantUml } from "./plant-uml.js";
import { Structurizr } from "./structurizr.js";

export namespace Tools {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        Graphviz.register(serviceProvider);
        Itself.register(serviceProvider);
        Java.register(serviceProvider);
        PlantUml.register(serviceProvider);
        Structurizr.register(serviceProvider);
    }
}
