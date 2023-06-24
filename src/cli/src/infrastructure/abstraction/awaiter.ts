export interface IAwaiter {
    wait(milliseconds: number): Promise<void>;
}