import { CancellationToken } from "./cancellationToken";

export interface IStartableService {
    start(cancellationToken?: CancellationToken | undefined): Promise<void>;
}

export interface IStoppableService {
    stop(): Promise<void>;
}

export interface ILifeTimeService extends IStartableService, IStoppableService {}
