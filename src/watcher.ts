import Dependency from "./dependency.js";
import Effect from "./effect.js";

type onChangeFunc<T> = (newValue: T, oldValue?: T) => void;

export default class Watcher<T> extends Effect {
    constructor(dependency: Dependency<T>, onChange: onChangeFunc<T>, immediate: boolean = true) {
        let oldValue: T | undefined = undefined;
        super((value, firstRun) => {
            const v = value(dependency);
            const localOldValue = oldValue;
            oldValue = v;
            if (!firstRun || immediate) {
                onChange(v, localOldValue);
            }
        });
    }
}