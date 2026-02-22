export class Deferrer {
    private lastPromise?: Promise<unknown>;

    constructor(private readonly callback: Function) { }

    finally(promise: Promise<unknown>) {
        const currentPromise = Promise.all([this.lastPromise, promise])
            .finally(() => {
                if (this.lastPromise === currentPromise) {
                    this.lastPromise = undefined;
                    this.callback();
                }
            });
        this.lastPromise = currentPromise;
    }
}