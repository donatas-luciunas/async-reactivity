import 'mocha';
import assert from 'assert';
import { Computed, Ref, Watcher } from './index.js';

describe('async reactivity', function () {
    describe('ref', function () {
        it('getter', function () {
            const a = new Ref(5);
            assert.strictEqual(a.value, 5);
        });

        it('setter', function () {
            const a = new Ref(5);
            a.value = 4;
            assert.strictEqual(a.value, 4);
        });
    });

    describe('computed', function () {
        it('lazy compute', function () {
            let gate = false;
            const a = new Computed(() => {
                gate = true;
                return 5;
            });

            assert.strictEqual(gate, false);
            assert.strictEqual(a.value, 5);
            assert.strictEqual(gate, true);
        });

        it('cache', function () {
            let gate = false;
            const a = new Computed(() => {
                gate = true;
                return 5;
            });

            assert.strictEqual(a.value, 5);

            gate = false;
            assert.strictEqual(a.value, 5);
            assert.strictEqual(gate, false);
        });

        it('invalidate dependents', function () {
            const a = new Ref(5);
            const b = new Computed((value) => {
                return value(a) + 4;
            });
            assert.strictEqual(b.value, 9);
            a.value = 6;
            assert.strictEqual(b.value, 10);
        });

        it('dependents up-to-date', function () {
            const a = new Ref(5);
            const b = new Ref(10);
            let gate;
            const c = new Computed((value) => {
                gate = true;
                return value(a) < 10 ? value(b) : 0;
            });
            assert.strictEqual(c.value, 10);
            a.value = 15;
            assert.strictEqual(c.value, 0);
            b.value = 15;
            gate = false;
            assert.strictEqual(c.value, 0);
            assert.strictEqual(gate, false);
        });

        it('detect circular dependency', function () {
            // @ts-expect-error
            const a = new Computed((value) => {
                return value(b);
            });
            // @ts-expect-error
            const b = new Computed((value) => {
                return value(a);
            });
            assert.throws(() => a.value);
        });

        xit('detect circular deeper dependency', function () {
            // do not support for better performance
            assert.fail('not implemented');
        });

        it('throw error', function () {
            const a = new Computed(() => {
                throw new Error();
            });
            assert.throws(() => a.value);
        });

        it('ignore same ref value', function () {
            let gate = 0;
            const a = new Ref(5);
            const b = new Computed((value) => {
                gate++;
                return value(a);
            });

            assert.strictEqual(b.value, 5);

            a.value = 5;
            assert.strictEqual(b.value, 5);
            assert.strictEqual(gate, 1);
        });

        it('ignore same computed value', function () {
            let gate = 0;
            const a = new Ref(5);
            const b = new Computed((value) => {
                return value(a) % 2;
            });
            const c = new Computed((value) => {
                gate++;
                return value(b) + 5;
            });

            assert.strictEqual(c.value, 6);

            a.value = 7;
            assert.strictEqual(c.value, 6);
            assert.strictEqual(gate, 1);
        });
    });

    describe('async computed', function () {
        it('getter', async function () {
            const a = new Computed(async () => {
                await new Promise(resolve => setTimeout(resolve));
                return 5;
            });
            assert.strictEqual(await a.value, 5);
        });

        it('tracks async dependencies', async function () {
            const a = new Ref(5);
            const b = new Computed(async (value) => {
                await new Promise(resolve => setTimeout(resolve));
                return value(a) + 5;
            });
            assert.strictEqual(await b.value, 10);
            a.value = 6;
            assert.strictEqual(await b.value, 11);
        });

        it('get value while computing', async function () {
            const a = new Computed(async () => {
                await new Promise(resolve => setTimeout(resolve));
                return 5;
            });

            a.value;
            assert.strictEqual(await a.value, 5);
        });

        it('detect circular dependency', async function () {
            // @ts-expect-error
            const a = new Computed(async (value) => {
                await new Promise(resolve => setTimeout(resolve));
                return value(b);
            });
            // @ts-expect-error
            const b = new Computed(async (value) => {
                await new Promise(resolve => setTimeout(resolve));
                return value(a);
            });

            assert.rejects(async () => await a.value);
        });

        it('old dependency changed while computing', async function () {
            let gate = 0;
            const a = new Ref(5);
            const b = new Computed(async (value) => {
                gate++;
                await new Promise(resolve => setTimeout(resolve));
                return value(a) + 2;
            });
            assert.strictEqual(await b.value, 7);
            b.invalidate();
            const promise = b.value;
            a.value = 6;
            assert.strictEqual(await promise, 8);
            assert.strictEqual(gate, 2);
        });

        it('new dependency changed while computing', async function () {
            let gate = 0;
            const a = new Ref(5);
            const b = new Ref(10);
            const c = new Computed(async (value) => {
                gate++;
                await new Promise(resolve => setTimeout(resolve, 50));
                let sum = value(a);
                await new Promise(resolve => setTimeout(resolve, 50));
                sum += value(b);
                return sum;
            });
            assert.strictEqual(await c.value, 15);
            c.invalidate();
            const promise = c.value;
            await new Promise(resolve => setTimeout(resolve, 60));
            a.value = 10;
            assert.strictEqual(await promise, 20);
            assert.strictEqual(gate, 3);
        });

        it('fallback to primitive while computing', async function () {
            const a = new Ref(5);
            const b = new Ref(10);
            const c = new Computed(async (value) => {
                if (value(a) < 10) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    return value(b) + 5;
                }
                return 2;
            });
            const promise = c.value;
            await new Promise(resolve => setTimeout(resolve, 20));
            a.value = 10;
            assert.strictEqual(await promise, 2);
        });

        it('throw error', async function () {
            const a = new Computed(async () => {
                await new Promise(resolve => setTimeout(resolve));
                throw new Error();
            });
            assert.rejects(() => a.value);
        });

        it('dispose computed', async function () {
            const a = new Ref(5);
            let gate = 0;
            const b = new Computed(value => {
                gate++;
                return value(a) + 2;
            });
            b.value;
            assert.strictEqual(gate, 1);
            b.dispose();
            b.value;
            assert.strictEqual(gate, 2);
        });
    });

    describe('watcher', function () {
        it('sync', function () {
            const a = new Ref(5);
            new Watcher(a, (newValue: number, oldValue?: number) => {
                assert.strictEqual(oldValue, 5);
                assert.strictEqual(newValue, 6);
            }, false);
            a.value = 6;
        });

        it('async', async function () {
            const a = new Computed(async () => {
                await new Promise(resolve => setTimeout(resolve));
                return 10;
            });
            const result = await new Promise<number>(resolve => new Watcher(a, resolve));
            assert.strictEqual(result, 10);
        });

        it('sync cancel', async function () {
            const a = new Ref(5);
            const b = new Computed((value) => {
                return value(a) % 2;
            });
            let gate = 0;
            new Watcher(b, () => {
                gate++;
            }, false);
            a.value = 6;
            assert.strictEqual(gate, 1);
            a.value = 7;
            a.value = 9;
            a.value = 11;
            assert.strictEqual(gate, 2);
        });

        it('async sync cancel', async function () {
            const a = new Ref(5);
            const b = new Computed(async (value) => {
                new Promise(resolve => setTimeout(resolve));
                return value(a) % 2;
            });
            let gate = 0;
            new Watcher(b, () => {
                gate++;
            }, false);
            await new Promise(resolve => setTimeout(resolve, 10));
            a.value = 6;
            await new Promise(resolve => setTimeout(resolve, 10));
            assert.strictEqual(gate, 1);
            a.value = 7;
            await new Promise(resolve => setTimeout(resolve, 10));
            assert.strictEqual(gate, 2);
            a.value = 9;
            await new Promise(resolve => setTimeout(resolve, 10));
            assert.strictEqual(gate, 3);
        });
    });
});