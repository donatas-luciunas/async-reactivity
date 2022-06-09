import Computed from "./computed";
import Watch from "./watch";

type Dependent = Computed<any> | Watch<any>;

export default class Tracker<T> {
    protected dependents = new Set<Dependent>();
    protected _value?: T;

    public addDependent(dependent: Dependent) {
        this.dependents.add(dependent);
    }

    public removeDependent(dependent: Dependent) {
        this.dependents.delete(dependent);
    }

    public invalidate(): void {
        for (const dependent of [...this.dependents.keys()]) {
            dependent.invalidate();
        }
    }

    public get value() {
        return this._value;
    }
}