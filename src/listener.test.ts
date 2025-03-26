import 'mocha';
import assert from 'assert';
import { mock } from 'node:test';
import { Watcher, Listener, Computed, Ref } from './index.js';

describe('listener', function () {
    it('wait for dependent', function () {
        assert.doesNotThrow(() => {
            new Listener(1,
                () => { throw new Error(); },
                () => { throw new Error(); }
            );
        });
    });

    it('init', function () {
        const listener = new Listener(1,
            () => { throw new Error(); },
            () => { throw new Error(); }
        );

        assert.strictEqual(listener.value, 1);
    });

    it('start', async function () {
        const listener = new Listener(1,
            () => {
                setTimeout(() => {
                    listener.value = 2;
                }, 10);
            },
            () => { },
        );

        const onChange = mock.fn();
        new Watcher(listener, onChange);

        assert.strictEqual(onChange.mock.callCount(), 1);
        assert.deepStrictEqual(onChange.mock.calls[0].arguments, [1]);

        await new Promise((resolve) => setTimeout(resolve, 20));

        assert.strictEqual(onChange.mock.callCount(), 2);
        assert.deepStrictEqual(onChange.mock.calls[1].arguments, [2, 1]);
    });

    it('stop', async function () {
        let gate = false;
        let timeout: NodeJS.Timeout;
        const listener = new Listener(1,
            () => {
                timeout = setTimeout(() => {
                    gate = true;
                    listener.value = 2;
                }, 10);
            },
            () => {
                clearTimeout(timeout);
            },
        );

        const w = new Watcher(listener, () => { });

        await new Promise((resolve) => setTimeout(resolve, 5));

        w.dispose();

        await new Promise((resolve) => setTimeout(resolve, 10));

        assert.strictEqual(gate, false);
    });

    it('stop + start', async function () {
        let timeout: NodeJS.Timeout;
        const listener = new Listener(1,
            () => {
                timeout = setTimeout(() => {
                    listener.value = 2;
                }, 10);
            },
            () => {
                clearTimeout(timeout);
            },
        );

        const onChange = mock.fn();
        const w1 = new Watcher(listener, onChange);
        assert.strictEqual(onChange.mock.callCount(), 1);

        await new Promise((resolve) => setTimeout(resolve, 5));

        w1.dispose();

        new Watcher(listener, onChange);
        assert.strictEqual(onChange.mock.callCount(), 2);

        await new Promise((resolve) => setTimeout(resolve, 15));

        assert.strictEqual(onChange.mock.callCount(), 3);
    });

    it('keep listening when recomputing', async function() {
        let gate = 0;
        const listener = new Listener(
            1,
            () => {
                gate++;
            },
            () => {}
        );

        const a = new Ref(5);

        const b = new Computed(value => value(a) + value(listener));

        b.value;
        assert.strictEqual(gate, 1);

        a.value = 6;
        b.value;
        assert.strictEqual(gate, 1);
    });

    it('keep listening when recomputing async', async function() {
        let gate = 0;
        const listener = new Listener(
            1,
            () => {
                gate++;
            },
            () => {}
        );

        const a = new Ref(5);

        const b = new Computed(async value => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return value(a) + value(listener);
        });

        const c = new Watcher(listener, () => {});

        b.value;
        await new Promise(resolve => setTimeout(resolve, 20));
        assert.strictEqual(gate, 1);

        a.value = 6;
        b.value;
        c.dispose();
        await new Promise(resolve => setTimeout(resolve, 20));
        assert.strictEqual(gate, 1);
    });
});