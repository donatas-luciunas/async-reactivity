import Dependency from "./dependency.js";

export default interface Dependent {
    invalidate(dependency?: Dependency<unknown>): void;
    validate(dependency: Dependency<unknown>): void;
    dispose(): void;
}