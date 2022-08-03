import Dependency from "./dependency.js";

export default interface Dependent {
    invalidate(): void;
    validate(dependency: Dependency<any>): void;
    dispose(): void;
}