import 'mocha';
import assert from 'assert';
import { Computed, Ref } from './index.js';

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
        assert.strictEqual(gate, 1);

        a.value = 7;
        assert.strictEqual(c.value, 6);
        assert.strictEqual(gate, 1);
    });

    it('ignore same computed values', function () {
        let gate = 0;
        const a = new Ref(5);
        const b1 = new Computed((value) => {
            return value(a) % 2;
        });
        const b2 = new Computed(() => 5);
        const c = new Computed((value) => {
            gate++;
            return value(b1) + value(b2);
        });

        assert.strictEqual(c.value, 6);
        assert.strictEqual(gate, 1);

        a.value = 7;
        assert.strictEqual(c.value, 6);
        assert.strictEqual(gate, 1);
    });

    it('compute when forced', function () {
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
        assert.strictEqual(gate, 1);

        c.forceInvalidate();
        assert.strictEqual(c.value, 6);
        assert.strictEqual(gate, 2);
    });

    it('isEqual', function() {
        const a = new Ref(1);
        const b = new Computed((value) => {
            return value(a);
        }, (_newValue, oldValue) => oldValue !== undefined);

        assert.strictEqual(b.value, 1);

        a.value = 2;
        assert.strictEqual(b.value, 1);
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

    it('dependency changed while computing', async function () {
        const a = new Ref(5);
        const b = new Computed(async (value) => value(a) + 5);
        b.value;            // trigger compute
        a.value = 8;
        assert.strictEqual(await b.value, 13);
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

    it('reset computed', async function () {
        const a = new Ref(5);
        let gate = 0;
        const b = new Computed(value => {
            gate++;
            return value(a) + 2;
        });
        b.value;
        assert.strictEqual(gate, 1);
        b.reset();
        b.value;
        assert.strictEqual(gate, 2);
    });

    it('auto reset', async function() {
        const a = new Computed(() => true, undefined, 0);
        const b = new Computed(value => value(a));

        assert.strictEqual(b.value, true);

        b.dispose();

        await new Promise(resolve => setTimeout(resolve, 10));

        // @ts-expect-error
        assert.strictEqual(a._value, undefined);
    });
});