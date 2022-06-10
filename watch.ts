import Dependency from "./dependency";
import Dependent from "./dependent";
import Tracker from "./tracker";

enum WatchState {
    Uncertain,
    Valid
};

type onChangeFunc<T> = (newValue: T, oldValue?: T) => void;

export default class Watch<T> extends Tracker<T> implements Dependent {

    private onChange: onChangeFunc<T>;
    private dependency: Dependency<T>;
    private state = WatchState.Valid;

    constructor(dependency: Dependency<T>, onChange: onChangeFunc<T>, immediate: boolean = true) {
        super();
        this.onChange = onChange;
        this.dependency = dependency;

        dependency.addDependent(this);
        this._value = dependency.value;
        if (immediate) {
            onChange(this._value);
        }
    }

    public invalidate() {
        this.state = WatchState.Uncertain;
        const oldValue = this._value;
        this._value = this.dependency.value;
        if (this.state === WatchState.Uncertain) {
            this.onChange(this._value, oldValue);
            this.state = WatchState.Valid;
        }
    }

    public validate() {
        this.state = WatchState.Valid;
    }

    public dispose() {
        this.dependency.removeDependent(this);
    }
}