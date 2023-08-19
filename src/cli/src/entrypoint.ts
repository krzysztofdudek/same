import { Analysis } from "./analysis/index.js";
import { Infrastructure } from "./infrastructure/index.js";
import { ServiceProvider } from "./infrastructure/service-provider.js";

export namespace Bootstrapper {
    export const serviceProvider = new ServiceProvider.ServiceProvider();

    Infrastructure.register(serviceProvider);

    Analysis.register(serviceProvider);
}
