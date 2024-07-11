import Dependency from "./dependency.js";
import Tracker from "./tracker.js";

const defaultIsEqual = <T>(v1?: T, v2?: T) => v1 === v2;

export default class Ref<T> extends Tracker<T> implements Dependency<T> {
    private isEqual: (a?: T, b?: T) => boolean;

    constructor(_value: T, isEqual = defaultIsEqual<T>) {
        super();
        this._value = _value;
        this.isEqual = isEqual;
    }

    public set value(_value: T) {
        const lastValue = this._value;
        this._value = _value;
        if (!this.isEqual(lastValue, _value)) {
            this.invalidate();
        }
    }

    public get value(): T {
        return super.value!;
    }
}