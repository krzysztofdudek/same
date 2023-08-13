import { ServiceProvider } from "./infrastructure/service-provider.js";
import { Infrastructure } from "./infrastructure/index.js";
import { Tools } from "./tools/index.js";
import { Core } from "./core/index.js";
import { Commands } from "./commands/index.js";
import { Build } from "./build/index.js";

export namespace Bootstrapper {
    export const serviceProvider = new ServiceProvider.ServiceProvider();

    Infrastructure.register(serviceProvider);
    Core.register(serviceProvider);
    Tools.register(serviceProvider);
    Commands.register(serviceProvider);
    Build.register(serviceProvider);
}
