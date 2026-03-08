import Dependency from "./dependency.js";
import defaultIsEqual from "./defaultIsEqual.js";
import { Dependent } from "./index.js";

export default class Ref<T> implements Dependency<T> {
    private isEqual: typeof defaultIsEqual<T>;
    protected dependents = new Set<Dependent>();
    protected _value?: T;

    constructor(value: T, isEqual = defaultIsEqual<T>) {
        this._value = value;
        this.isEqual = isEqual;
    }

    public set value(value: T) {
        const oldValue = this._value!;
        this._value = value;
        if (this.dependents.size > 0 && !this.isEqual(value, oldValue)) {
            this.invalidate();
        }
    }

    public get value(): T {
        return this._value!;
    }

    public addDependent(dependent: Dependent) {
        this.dependents.add(dependent);
    }

    public removeDependent(dependent: Dependent) {
        this.dependents.delete(dependent);
    }

    public invalidate(): void {
        for (const dependent of this.dependents) {
            dependent.invalidate(this);
        }
    }
}