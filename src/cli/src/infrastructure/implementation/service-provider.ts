import { IServiceProvider } from "../abstraction/service-provider";

export class ServiceProvider implements IServiceProvider {
    private services: { key: string, service: any | null, factory: () => any }[] = [];

    register(key: string, factory: () => any): void {
        if (this.services.find(x => x.key === key)) {
            throw new Error(`Cannot register service with key "${key}" again.`);
        }

        this.services.push({
            key: key,
            service: null,
            factory: factory
        });
    }
    resolve<ServiceType>(key: string): ServiceType {
        const entry = this.services.find(x => x.key === key);

        if (entry === undefined) {
            throw new Error(`Service with key "${key}" cannot be resolved.`);
        }

        if (entry.service !== null) {
            return entry.service;
        }

        entry.service = entry.factory();

        return entry.service;
    }
}