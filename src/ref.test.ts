import 'mocha';
import assert from 'assert';
import { Ref, Watcher } from './index.js';

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

    it('setter isEqual', function () {
        const a = new Ref(5, () => true);
        new Watcher(a, () => {
            assert.fail();
        }, false);
        a.value = 4;
    });
});