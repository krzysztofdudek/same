import { setTimeout } from "timers/promises";
import { ServiceProvider } from "./service-provider";

export namespace Awaiter {
    export const iAwaiterServiceKey = "Awaiter.IAwaiter";

    export function register(serviceProvider: ServiceProvider.IServiceProvider) {
        serviceProvider.registerSingleton(iAwaiterServiceKey, () => new Awaiter());
    }

    export interface IAwaiter {
        wait(milliseconds: number): Promise<void>;
    }

    export class Awaiter {
        wait(milliseconds: number): Promise<void> {
            return setTimeout(milliseconds);
        }
    }
}
