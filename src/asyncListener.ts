import Listener from "./listener.js";

export default class AsyncListener<T> extends Listener<Promise<T>> {
    private promiseResolve?: (value: T) => void;

    constructor(start: () => void, stop: () => void) {
        let promiseResolve;
        super(new Promise<T>(resolve => {
            promiseResolve = resolve;
        }), start, stop);
        this.promiseResolve = promiseResolve;
    }

    public set value(_value: Promise<T>) {
        if (this.promiseResolve) {
            _value.then(this.promiseResolve);
            this.promiseResolve = undefined;
            this._value = _value;   // prevent invalidate
        }
        super.value = _value;
    }

    public get value(): Promise<T> {
        return super.value!;
    }
}