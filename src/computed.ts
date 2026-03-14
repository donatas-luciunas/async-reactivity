import Dependency from "./dependency.js";
import Dependent from "./dependent.js";
import defaultIsEqual from "./defaultIsEqual.js";
import { Deferrer } from "./deferrer.js";
import { debounce } from 'lodash-es';
import Effect, { EffectState, InSyncSymbol } from "./effect.js";

export declare type TrackValue = (<T>(dependency: Dependency<T>) => T) & (<T>(dependency: Dependency<T> | undefined) => T | undefined);
export declare type ComputeFunc<T> = (value: TrackValue, previousValue: T | undefined, abortSignal: AbortSignal) => T;
export declare type ComputeFuncScoped<T1, T2> = (value: TrackValue, scope: T1, previousValue: T2 | undefined, abortSignal: AbortSignal) => T2;

class CircularDependencyError extends Error { }

export default class Computed<T> extends Effect implements Dependent, Dependency<T> {
    private oldValue?: T;
    private _value?: T;
    getter: ComputeFunc<T>;
    isEqual: typeof defaultIsEqual<T>;
    private dependents = new Set<Dependent>();
    private deferrer?: Deferrer;

    constructor(getter: ComputeFunc<T>, isEqual = defaultIsEqual<T>, timeToLive?: number) {

        super(((value, _firstRun, abortSignal) => {
            return getter(value, this.oldValue, abortSignal);
        }), true);

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
            this.oldValue = this._value!;
            const newValue = this.run() as T;
            if (newValue instanceof Promise) {
                // @ts-expect-error
                this._value = Promise.all([newValue, this.oldValue])
                    .then(([newValue, oldValue]) => {
                        if (newValue === InSyncSymbol) {
                            this.validateDependents();
                            return oldValue;
                        }
                        if (this.dependents.size > 0 && this.isEqual(newValue, oldValue)) {
                            this.validateDependents();
                        }
                        return newValue;
                    }).finally(() => {
                        if (this.state === EffectState.Waiting) {
                            this.oldValue = undefined;
                        }
                    });
            } else {
                if (newValue === InSyncSymbol) {
                    this.validateDependents();
                } else {
                    this._value = newValue;
                    if (this.dependents.size > 0 && this.isEqual(newValue, this.oldValue)) {
                        this.validateDependents();
                    }
                }
                this.oldValue = undefined;
            }
        }

        return this._value!;
    }

    private validateDependents() {
        for (const dependent of this.dependents) {
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
            for (const dependent of this.dependents) {
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