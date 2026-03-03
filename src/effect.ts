import Dependency from "./dependency.js";
import Dependent from "./dependent.js";

export declare type TrackValue = (<T>(dependency: Dependency<T>) => T) & (<T>(dependency: Dependency<T> | undefined) => T | undefined);
export declare type EffectFunc = (value: TrackValue, firstRun: boolean, abortSignal: AbortSignal) => unknown | Promise<unknown>;

export enum EffectState {
    Initial,
    Running,
    Waiting,
    Scheduled,
};

export const InSyncSymbol = Symbol('inSync');

export default class Effect implements Dependent {
    protected state = EffectState.Initial;
    protected dependencies = new Map<Dependency<unknown>, boolean>();   // boolean indicates whether effect is in sync with the dependency
    private abortHandler?: { promise: Promise<void>, abort: Function, aborted: boolean, controller: AbortController };

    constructor(private readonly effect: EffectFunc, private readonly computed = false) {
        if (!computed) {
            this.run();
        }
    }

    private innerTrackDependency(this: Effect, dependency?: Dependency<unknown>) {
        if (dependency === undefined) {
            return undefined;
        }
        this.dependencies.set(dependency, true);
        dependency.addDependent(this);
        return dependency.value;
    }

    private trackDependency = this.innerTrackDependency.bind(this) as TrackValue;

    run() {
        let firstRun = this.state === EffectState.Initial;

        if (this.state === EffectState.Scheduled) {
            const inSync = [...this.dependencies.entries()].every(([d, inSync]) => {
                if (!inSync) {
                    d.value;
                    return this.dependencies.get(d);
                }
                return inSync;
            });
            if (inSync) {
                this.state = EffectState.Waiting;
                return InSyncSymbol;
            }
        }

        this.state = EffectState.Running;

        const getResult = (): unknown | Promise<unknown> => {
            this.clearDependencies(runPromise);
            this.abortHandler = (() => {
                const handler = {
                    promise: undefined as unknown as Promise<void>,
                    abort: () => { },
                    aborted: false,
                    controller: new AbortController()
                };
                handler.promise = new Promise<void>((resolve) => {
                    handler.abort = () => {
                        handler.aborted = true;
                        handler.controller.abort();
                        resolve();
                    };
                });
                return handler;
            })();

            const completeRun = (resolve: boolean, result: unknown, err: unknown, async: boolean) => {
                if (this.abortHandler!.aborted) {
                    firstRun = false;
                    if (this.computed || async) {
                        return getResult();
                    }
                    return Promise.resolve().then(() => getResult());
                }

                this.state = EffectState.Waiting;
                this.abortHandler = undefined;
                resolveRunPromise();

                if (resolve) {
                    return result;
                } else {
                    throw err;
                }
            };

            try {
                const resultMaybePromise = this.effect(this.trackDependency, firstRun, this.abortHandler.controller.signal);
                if (resultMaybePromise instanceof Promise) {
                    return Promise.race([resultMaybePromise, this.abortHandler!.promise])
                        .then((result) => completeRun(true, result, undefined, true))
                        .catch((err) => completeRun(false, undefined, err, true));
                }
                return completeRun(true, resultMaybePromise, undefined, false);
            } catch (err) {
                return completeRun(false, undefined, err, false);
            }
        };

        let resolveRunPromise: Function;
        const runPromise = new Promise<void>(resolve => {
            resolveRunPromise = resolve;
        });
        return getResult();
    }

    private clearDependencies(promise?: Promise<void>) {
        for (const dependency of this.dependencies.keys()) {
            dependency.removeDependent(this, promise);
        }
        this.dependencies.clear();
    }

    invalidate(dependency?: Dependency<unknown>) {
        if (dependency) {
            this.dependencies.set(dependency, false);
        }

        if (this.state === EffectState.Running && !this.abortHandler?.aborted) {
            this.abortHandler?.abort();
        } else if (this.state === EffectState.Waiting) {
            this.state = EffectState.Scheduled;
            Promise.resolve().then(this.run.bind(this));
        }
    }

    validate(dependency: Dependency<unknown>) {
        this.dependencies.set(dependency, true);
    }

    dispose() {
        this.clearDependencies();

        this.abortHandler?.abort();
        this.abortHandler = undefined;

        this.state = EffectState.Initial;
    }

}