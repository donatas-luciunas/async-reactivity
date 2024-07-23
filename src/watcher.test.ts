import 'mocha';
import assert from 'assert';
import { Computed, Ref, Watcher } from './index.js';

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
        await new Promise(resolve => setTimeout(resolve));
        assert.strictEqual(gate, 1);
        a.value = 7;
        a.value = 9;
        a.value = 11;
        await new Promise(resolve => setTimeout(resolve));
        assert.strictEqual(gate, 2);
    });

    it('async sync cancel', async function () {
        const a = new Ref(5);
        let computedGate = 0;
        const b = new Computed(async (value) => {
            computedGate++;
            new Promise(resolve => setTimeout(resolve));
            return value(a) % 2;
        });
        let watcherGate = 0;
        new Watcher(b, () => {
            watcherGate++;
        }, false);
        await new Promise(resolve => setTimeout(resolve, 10));
        a.value = 6;
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.strictEqual(computedGate, 2);
        assert.strictEqual(watcherGate, 1);
        a.value = 7;
        a.value = 9;
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.strictEqual(computedGate, 3);
        assert.strictEqual(watcherGate, 2);
    });
});