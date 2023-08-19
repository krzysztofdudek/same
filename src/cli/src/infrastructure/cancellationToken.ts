const exceptionText = "Operation cancelled exception.";

export class CancellationToken {
    private _isCancelled: boolean = false;

    cancel() {
        this._isCancelled = true;
    }

    public get isCancelled() {
        return this._isCancelled;
    }

    throwIfCancelled() {
        if (this._isCancelled) {
            throw new Error(exceptionText);
        }
    }

    static isCancellation(error: Error): boolean {
        return error.message === exceptionText;
    }
}
