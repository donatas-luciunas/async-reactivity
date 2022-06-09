import Tracker from "./tracker";

export default class Ref<T> extends Tracker {

    constructor(_value: T) {
        super();
        this._value = _value;
    }

    public set value(_value: T) {
        const lastValue = this._value;
        this._value = _value;
        if (lastValue !== _value) {
            this.invalidate();
        }
    }

    public get value(): T {
        return super.value;
    }
}