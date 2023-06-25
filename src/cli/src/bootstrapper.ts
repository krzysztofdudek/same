import { ServiceProvider } from "./infrastructure/service-provider";
import { Infrastructure } from "./infrastructure";
import { Tools } from "./tools";
import { Core } from "./core";

export namespace Bootstrapper {
    export const serviceProvider = new ServiceProvider.ServiceProvider();

    Infrastructure.register(serviceProvider);
    Core.register(serviceProvider);
    Tools.register(serviceProvider);
}
