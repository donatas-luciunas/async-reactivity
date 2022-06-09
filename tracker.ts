export default class Tracker {
    protected dependents = new Map();
    protected _value: any;

    public addDependent(dependent: Tracker) {
        // todo: this can create memory leak
        // after user does not need a Tracker, it could still be saved as dependent somewhere
        this.dependents.set(dependent, 0);
    }

    public removeDependent(dependent: Tracker) {
        this.dependents.delete(dependent);
    }

    // todo: gal ne public
    public invalidate() {
        for (const dependent of [...this.dependents.keys()]) {
            dependent.invalidate();
        }
    }

    public get value() {
        return this._value;
    }
}