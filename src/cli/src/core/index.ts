import { ServiceProvider } from "../infrastructure/service-provider.js";
import { Build } from "./build.js";
import { GitHub } from "./github.js";
import { Manifest } from "./manifest.js";
import { Publish } from "../publish/publish-static-files.js";
import { Toolset } from "./toolset.js";

export namespace Core {
    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        GitHub.register(serviceProvider);
        Manifest.register(serviceProvider);
        Toolset.register(serviceProvider);
        Build.register(serviceProvider);
        Publish.register(serviceProvider);
    }
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

export async function asyncForeach<T>(items: T[], callback: (item: T) => Promise<void>) {
    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        await callback(item);
    }
}
