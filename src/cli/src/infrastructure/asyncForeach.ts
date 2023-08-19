export async function asyncForeach<T>(items: T[], callback: (item: T) => Promise<void>) {
    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        await callback(item);
    }
}
