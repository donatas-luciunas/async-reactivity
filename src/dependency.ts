import Dependent from "./dependent.js";

export default interface Dependency<T> {
    get value(): T;
    addDependent(dependent: Dependent): void;
    removeDependent(dependent: Dependent, promise?: Promise<any>): void;
}