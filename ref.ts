import Tracker from "./tracker";

export default class Ref extends Tracker {

    constructor(_value: any) {
        super();
        this._value = _value;
    }

    public set value(_value: any) {
        const lastValue = this._value;
        this._value = _value;
        if (lastValue !== _value) {
            this.invalidate();
        }
    }

    public get value() {
        return super.value;
    }
}