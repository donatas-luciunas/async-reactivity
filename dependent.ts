import Dependency from "./dependency";

export default interface Dependent {
    invalidate(): void;
    validate(dependency: Dependency<any>): void;
}