import Dependency from "./dependency";
import Dependent from "./dependent";
import Tracker from "./tracker";

declare type TrackValue = <T>(dependency: Dependency<T>) => T;
export declare type ComputeFunc<T> = (value: TrackValue) => T;
export declare type ComputeFuncScoped<T1, T2> = (value: TrackValue, scope: T1) => T2;

enum ComputedState {
    Invalid,
    Valid,
    Uncertain,
    Computing
};

class CircularDependencyError extends Error { }

export default class Computed<T> extends Tracker<T> implements Dependent, Dependency<T> {
    getter: ComputeFunc<T>;
    private state = ComputedState.Invalid;
    private dependencies = new Map<Dependency<any>, boolean>();
    private computePromise?: T;
    private computePromiseActions?: { resolve: Function, reject: Function };
    private lastComputeAttemptPromise?: Promise<void>;

    constructor(getter: ComputeFunc<T>) {
        super();
        this.getter = getter;
        this.prepareComputePromise();
    }

    private prepareComputePromise() {
        this.computePromise = new Promise((resolve, reject) => {
            this.computePromiseActions = {
                resolve,
                reject
            };
        }) as unknown as T;
    }

    public get value(): T {
        if (this.state === ComputedState.Invalid || this.state === ComputedState.Uncertain) {
            return this.compute();
        }

        return this._value!;
    }

    private compute() {
        if (this.state === ComputedState.Uncertain) {
            for (const dependency of this.dependencies.keys()) {
                this.dependencies.set(dependency, true);
            }
            if ([...this.dependencies.keys()].every(d => {
                d.value;
                return !this.dependencies.get(d);
            })) {
                this.finalizeComputing();
                this.validateDependents();
                return this._value!;
            }
        }

        this.state = ComputedState.Computing;
        this.clearDependencies();

        const lastValue = this._value;
        this._value = this.getter(this.trackDependency);
        if (this._value instanceof Promise) {
            const computeAttemptPromise = this._value
                .then(result => this.handlePromiseThen(computeAttemptPromise, result))
                .catch(error => this.handlePromiseCatch(computeAttemptPromise, error)) as Promise<void>;
            this.lastComputeAttemptPromise = computeAttemptPromise;
            this._value = this.computePromise!;
        } else {
            this.handlePromiseThen(this.lastComputeAttemptPromise!, this._value);
            if (lastValue === this._value) {
                this.validateDependents();
            }
        }
        return this._value!;
    }

    private clearDependencies() {
        for (const dependency of this.dependencies.keys()) {
            dependency.removeDependent(this);
        }
        this.dependencies.clear();
    }

    private handlePromiseThen(computeAttemptPromise: Promise<void>, result: any) {
        if (this.lastComputeAttemptPromise === computeAttemptPromise) {
            this.computePromiseActions!.resolve(result);
            this.finalizeComputing();
        }
    }

    private handlePromiseCatch(computeAttemptPromise: Promise<void>, error: any) {
        if (this.lastComputeAttemptPromise === computeAttemptPromise) {
            this.computePromiseActions!.reject(error);
            this.finalizeComputing();
        }
    }

    private innerTrackDependency(this: Computed<T>, dependency: Dependency<any>) {
        if (this.dependents.has(dependency as any)) {
            throw new CircularDependencyError();
        }
        this.dependencies.set(dependency, true);
        dependency.addDependent(this);
        return dependency.value;
    }

    private trackDependency = this.innerTrackDependency.bind(this);

    private finalizeComputing() {
        this.state = ComputedState.Valid;
        this.lastComputeAttemptPromise = undefined;
        this.prepareComputePromise();
    }

    public invalidate() {
        if (this.state === ComputedState.Computing) {
            setImmediate(this.compute.bind(this));
        } if (this.state !== ComputedState.Uncertain) {
            this.state = ComputedState.Uncertain;
            super.invalidate();
        }
    }

    public validate(dependency: Dependency<any>) {
        this.dependencies.set(dependency, false);
    }

    private validateDependents() {
        for (const dependent of this.dependents.keys()) {
            dependent.validate(this);
        }
    }

    public dispose() {
        this.clearDependencies();
        this.state = ComputedState.Invalid;
        this._value = undefined;
        this.lastComputeAttemptPromise = undefined;
        this.prepareComputePromise();
    }
}