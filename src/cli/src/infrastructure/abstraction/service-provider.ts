export interface IServiceProvider {
    register(key: string, factory: () => any): void;
    resolve<ServiceType>(key: string): ServiceType;
}