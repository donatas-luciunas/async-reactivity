import Dependent from "./dependent.js";
import Ref from "./ref.js";
import defaultIsEqual from "./defaultIsEqual.js";
import { Deferrer } from "./deferrer.js";

export default class Listener<T extends TBase, TBase = T> extends Ref<T> {
    private start: () => void;
    private stop: () => void;
    private listening = false;
    private deferrer: Deferrer;

    constructor(_value: T, start: () => void, stop: () => void, isEqual = defaultIsEqual<TBase>) {
        super(_value, isEqual);

        this.start = start;
        this.stop = stop;

        this.deferrer = new Deferrer(() => {
            if (this.dependents.size === 0) {
                this.listening = false;
                this.stop();
            }
        });
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
        this.deferrer.finally(promise);
    }
}