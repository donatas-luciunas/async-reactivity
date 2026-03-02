import Dependency from "./dependency.js";
import Dependent from "./dependent.js";
import defaultIsEqual from "./defaultIsEqual.js";
import { Deferrer } from "./deferrer.js";
import { debounce } from 'lodash-es';
import Effect, { EffectState } from "./effect.js";

export declare type TrackValue = (<T>(dependency: Dependency<T>) => T) & (<T>(dependency: Dependency<T> | undefined) => T | undefined);
export declare type ComputeFunc<T> = (value: TrackValue, previousValue: T | undefined, abortSignal: AbortSignal) => T;
export declare type ComputeFuncScoped<T1, T2> = (value: TrackValue, scope: T1, previousValue: T2 | undefined, abortSignal: AbortSignal) => T2;

class CircularDependencyError extends Error { }

export default class Computed<T> extends Effect implements Dependent, Dependency<T> {
    private _value?: T;
    getter: ComputeFunc<T>;
    isEqual: typeof defaultIsEqual<T>;
    private dependents = new Set<Dependent>();
    private deferrer?: Deferrer;

    constructor(getter: ComputeFunc<T>, isEqual = defaultIsEqual<T>, timeToLive?: number) {
        let computePromiseActions: { resolve: Function, reject: Function } | undefined = undefined;
        const completeAction = (action: 'resolve' | 'reject', promise: Promise<unknown>, value: T | Error) => {
            if (promise === lastComputePromise) {
                computePromiseActions![action](value);
                computePromiseActions = undefined;
            }
        };

        let lastComputePromise: T | undefined = undefined;
        super(((value, _firstRun, abortSignal) => {
            const newValue = getter(value, this._value, abortSignal);
            if (newValue instanceof Promise) {
                if (!computePromiseActions) {
                    this._value = new Promise((resolve, reject) => {
                        computePromiseActions = { reject, resolve };
                    }) as T;
                }
                lastComputePromise = newValue;
                newValue
                    .then(v => completeAction('resolve', newValue, v))
                    .catch(err => completeAction('reject', newValue, err));
                return newValue;
            } else {
                this._value = newValue;
            }
        }), false);

        this.getter = getter;
        this.isEqual = isEqual;

        if (timeToLive !== undefined) {
            this.deferrer = new Deferrer(debounce(() => {
                if (this.dependents.size === 0) {
                    this.reset();
                }
            }, timeToLive));
        }
    }

    public get value(): T {
        if (this.state === EffectState.Initial || this.state === EffectState.Scheduled) {
            const oldValue = this._value!;
            this.run();
            if (this.isEqual(this._value!, oldValue)) {
                this.validateDependents();
            }
        }

        return this._value!;
    }

    private validateDependents() {
        for (const dependent of this.dependents.keys()) {
            dependent.validate(this);
        }
    }

    public addDependent(dependent: Dependent) {
        if (this.dependencies.has(dependent as any)) {
            throw new CircularDependencyError();
        }
        this.dependents.add(dependent);
    }

    public removeDependent(dependent: Dependent, promise = Promise.resolve()): void {
        this.dependents.delete(dependent);
        this.deferrer?.finally(promise);
    }

    public invalidate(dependency?: Dependency<unknown>) {
        if (this.state === EffectState.Waiting) {
            this.state = EffectState.Scheduled;
            for (const dependent of [...this.dependents.keys()]) {
                dependent.invalidate(this);
            }
        }

        super.invalidate(dependency);
    }

    public forceInvalidate() {
        if (this.dependencies.size === 0) {
            this.invalidate();
        } else {
            for (const dependency of this.dependencies.keys()) {
                this.invalidate(dependency);
            }
        }
        if (this.state !== EffectState.Running) {
            this.state = EffectState.Initial;
        }
    }

    public reset() {
        this._value = undefined;
        super.dispose();
    }

    public dispose() {
        this.reset();
    }
}