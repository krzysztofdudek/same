import { setTimeout } from "timers/promises";

export class Awaiter {
    wait(milliseconds: number): Promise<void> {
        return setTimeout(milliseconds);
    }
}