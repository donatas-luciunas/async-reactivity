import Dependency from "./dependency.js";
import Dependent from "./dependent.js";

export declare type TrackValue = (<T>(dependency: Dependency<T>) => T) & (<T>(dependency: Dependency<T> | undefined) => T | undefined);
export declare type EffectFunc = (value: TrackValue, firstRun: boolean, abortSignal: AbortSignal) => void | Promise<void>;

export enum EffectState {
    Initial,
    Running,
    Waiting,
    Scheduled,
};

export default class Effect implements Dependent {
    private effect: EffectFunc;
    protected state = EffectState.Initial;
    protected dependencies = new Map<Dependency<unknown>, boolean>();   // boolean indicates whether effect is in sync with the dependency
    private abortController?: AbortController;
    private runPromise?: Promise<unknown>;
    private runPromiseResolve?: Function;
    private lastRunPromise?: Promise<void>;

    constructor(_effect: EffectFunc, immediate = true) {
        this.effect = _effect;
        this.prepareRunPromise();
        if (immediate) {
            this.run();
        }
    }

    private prepareRunPromise() {
        this.runPromise = new Promise((resolve) => {
            this.runPromiseResolve = resolve;
        });
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
        const firstRun = this.state === EffectState.Initial;

        if (this.state === EffectState.Scheduled) {
            const inSync = [...this.dependencies.entries()].every(([d, inSync]) => {
                if (!inSync) {
                    d.value;
                    return this.dependencies.get(d);
                }
                return inSync;
            });
            if (inSync) {
                this.completeRun();
                return;
            }
        }

        this.state = EffectState.Running;
        this.clearDependencies(true);
        this.abortController = new AbortController();

        const result = this.effect(this.trackDependency, firstRun, this.abortController.signal);
        if (result instanceof Promise) {
            this.lastRunPromise = result;
            this.lastRunPromise.finally(() => {
                if (this.lastRunPromise === result) {
                    this.completeRun();
                }
            });
        } else {
            this.completeRun();
        }
    }

    private clearDependencies(running: boolean) {
        for (const dependency of this.dependencies.keys()) {
            dependency.removeDependent(this, running ? this.runPromise : undefined);
        }
        this.dependencies.clear();
    }

    private completeRun() {
        this.runPromiseResolve!();
        this.state = EffectState.Waiting;
        this.abortController = undefined;
        this.prepareRunPromise();
    }

    invalidate(dependency?: Dependency<unknown>) {
        if (dependency) {
            this.dependencies.set(dependency, false);
        }

        if (this.state === EffectState.Running && this.abortController) {
            this.abortController.abort();
            this.abortController = undefined;
            this.lastRunPromise = undefined;
            Promise.resolve().then(this.run.bind(this));
        } else if (this.state === EffectState.Waiting) {
            this.state = EffectState.Scheduled;
            Promise.resolve().then(this.run.bind(this));
        }
    }

    validate(dependency: Dependency<unknown>) {
        this.dependencies.set(dependency, true);
    }

    dispose() {
        this.clearDependencies(false);

        this.abortController?.abort();
        this.abortController = undefined;

        this.lastRunPromise = undefined;

        this.state = EffectState.Initial;
    }

}