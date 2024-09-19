import Dependency from "./dependency.js";
import Dependent from "./dependent.js";
import Tracker from "./tracker.js";

export default class Listener<T> extends Tracker<T> implements Dependency<T> {
    private init: () => T;
    private start: (setter: (value: T) => void) => void;
    private stop: () => void;
    private listening = false;

    constructor({ init, start, stop }: { init: () => T, start: (setter: (value: T) => void) => void, stop: () => void }) {
        super();

        this.init = init;
        this.start = start;
        this.stop = stop;
    }

    public addDependent(dependent: Dependent): void {
        super.addDependent(dependent);
        if (!this.listening) {
            this.start((value) => {
                this._value = value;
                this.invalidate();
            });
            this.listening = true;
        }
    }

    public removeDependent(dependent: Dependent): void {
        super.removeDependent(dependent);
        if (this.dependents.size === 0) {
            this.stop();
            this.listening = false;
        }
    }

    public get value() {
        if (this._value === undefined) {
            this._value = this.init();
        }
        return this._value;
    }
}