import { CancellationToken } from "./cancellationToken";

export async function asyncForeach<T>(
    items: T[],
    callback: (item: T) => Promise<void>,
    cancellationToken?: CancellationToken | undefined
) {
    for (let i = 0; i < items.length; i++) {
        cancellationToken?.throwIfCancelled();

        const item = items[i];

        await callback(item);
    }
}
