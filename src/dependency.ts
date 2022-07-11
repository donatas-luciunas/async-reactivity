import Dependent from "./dependent";

export default interface Dependency<T> {
    get value(): T;
    addDependent(dependent: Dependent): void;
    removeDependent(dependent: Dependent): void;
}