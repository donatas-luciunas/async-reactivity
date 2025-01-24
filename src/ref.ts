import Dependency from "./dependency.js";
import Tracker from "./tracker.js";
import defaultIsEqual from "./defaultIsEqual.js";

export default class Ref<T extends TBase, TBase = T> extends Tracker<T> implements Dependency<T> {
    private isEqual: typeof defaultIsEqual<TBase>;

    constructor(_value: T, isEqual = defaultIsEqual<TBase>) {
        super();
        this._value = _value;
        this.isEqual = isEqual;
    }

    public set value(_value: T) {
        const lastValue = this._value!;
        this._value = _value;
        if (!this.isEqual(lastValue, _value)) {
            this.invalidate();
        }
    }

    public get value(): T {
        return super.value!;
    }
}