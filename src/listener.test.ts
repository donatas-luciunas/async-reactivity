import 'mocha';
import assert from 'assert';
import { mock } from 'node:test';
import { Watcher, Listener } from './index.js';

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
});