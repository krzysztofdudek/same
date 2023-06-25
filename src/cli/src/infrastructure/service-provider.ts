export namespace ServiceProvider {
    export const iServiceProviderServiceKey = "ServiceProvider.IServiceProvider";

    export interface IServiceProvider {
        registerSingleton(key: string, factory: () => any): void;
        registerSingletonMany(keys: string[], factory: () => any): void;
        registerTransient(key: string, factory: () => any): void;
        registerTransientMany(keys: string[], factory: () => any): void;
        resolve<ServiceType>(key: string): ServiceType;
        resolveMany<ServiceType>(key: string): ServiceType[];
    }

    export class ServiceProvider implements IServiceProvider {
        private services: { key: string; service: unknown | null; factory: () => unknown; isSingleton: boolean }[] = [];

        public constructor() {
            this.services.push({
                key: iServiceProviderServiceKey,
                service: null,
                factory: () => this,
                isSingleton: true,
            });
        }
        registerTransient(key: string, factory: () => any): void {
            this.services.push({
                key: key,
                service: null,
                factory: factory,
                isSingleton: false,
            });
        }
        registerTransientMany(keys: string[], factory: () => any): void {
            keys.forEach((key) => {
                this.services.push({
                    key: key,
                    service: null,
                    factory: factory,
                    isSingleton: false,
                });
            });
        }

        registerSingleton(key: string, factory: () => any): void {
            this.services.push({
                key: key,
                service: null,
                factory: factory,
                isSingleton: true,
            });
        }

        registerSingletonMany(keys: string[], factory: () => any): void {
            keys.forEach((key) => {
                this.services.push({
                    key: key,
                    service: null,
                    factory: factory,
                    isSingleton: true,
                });
            });
        }

        resolve<ServiceType>(key: string): ServiceType {
            const entry = this.services.find((x) => x.key === key);

            if (entry === undefined) {
                throw new Error(`Service with key "${key}" cannot be resolved.`);
            }

            if (entry.service !== null) {
                return <ServiceType>entry.service;
            }

            const instance = entry.factory();

            if (entry.isSingleton) {
                entry.service = instance;
            }

            return <ServiceType>instance;
        }

        resolveMany<ServiceType>(key: string): ServiceType[] {
            return this.services.filter((x) => x.key === key).map((x) => <ServiceType>x.service);
        }
    }
}
