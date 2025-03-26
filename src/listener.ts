import Dependent from "./dependent.js";
import Ref from "./ref.js";
import defaultIsEqual from "./defaultIsEqual.js";

export default class Listener<T extends TBase, TBase = T> extends Ref<T> {
    private start: () => void;
    private stop: () => void;
    private listening = false;
    private lastPromise: Promise<any> | undefined;

    constructor(_value: T, start: () => void, stop: () => void, isEqual = defaultIsEqual<TBase>) {
        super(_value, isEqual);

        this.start = start;
        this.stop = stop;
    }

    public addDependent(dependent: Dependent): void {
        super.addDependent(dependent);
        if (!this.listening) {
            this.listening = true;
            this.start();
        }
    }

    public removeDependent(dependent: Dependent, promise = Promise.resolve()): void {
        super.removeDependent(dependent);

        const currentPromise = Promise.all([promise, this.lastPromise]).finally(() => {
            if (this.lastPromise === currentPromise) {
                if (this.dependents.size === 0) {
                    this.listening = false;
                    this.stop();
                }
            }
        });
        this.lastPromise = currentPromise;
    }
}