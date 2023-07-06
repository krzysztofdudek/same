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

    export class CancellationToken {
        private _isCancelled: boolean = false;

        cancel() {
            this._isCancelled = true;
        }

        public get isCancelled() {
            return this._isCancelled;
        }
    }
}
