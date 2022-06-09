import Tracker from "./tracker";

enum WatchState {
    Uncertain,
    Valid
};

export default class Watch extends Tracker {
    private onChange: Function;
    private dependency: Tracker;
    private state = WatchState.Valid;

    constructor(dependency: Tracker, onChange: Function, immediate: boolean = true) {
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
}