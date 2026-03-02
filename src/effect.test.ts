import 'mocha';
import assert from 'assert';
import Effect from './effect.js';
import Ref from './ref.js';
import Computed from './computed.js';
import { values } from 'lodash-es';

describe('effect', function () {
    describe('sync', function () {
        it('should run effect immediately', function () {
            let count = 0;

            new Effect(() => {
                count++;
            });

            assert.strictEqual(count, 1);
        });

        it('should not run immediately after dependency is changed', function () {
            let count = 0;
            const a = new Ref(5);

            new Effect((value) => {
                value(a);
                count++;
            });

            assert.strictEqual(count, 1);
            a.value = 4;
            assert.strictEqual(count, 1);
        });

        it('should run effect when dependency (ref) changes', async function () {
            let count = 0;
            const a = new Ref(5);

            new Effect((value) => {
                value(a);
                count++;
            });

            a.value = 4;
            await new Promise(resolve => setTimeout(resolve));

            assert.strictEqual(count, 2);
        });

        it('should indicate first run', async function () {
            let count = 0;
            const a = new Ref(5);

            new Effect((_value, firstRun) => {
                values(a);
                assert.strictEqual(firstRun, count === 0);
                count++;
            });

            a.value = 4;
            await new Promise(resolve => setTimeout(resolve));
        });

        it('should run effect once when dependency (ref) changes multiple times synchronously', async function () {
            let count = 0;
            const a = new Ref(5);

            new Effect((value) => {
                value(a);
                count++;
            });

            a.value = 4;
            a.value = 3;
            await new Promise(resolve => setTimeout(resolve));

            assert.strictEqual(count, 2);
        });

        it('should run effect when dependency (computed) changes', async function () {
            let count = 0;
            const a = new Ref(5);
            const b = new Computed(value => value(a) + 1);

            new Effect((value) => {
                value(b);
                count++;
            });

            assert.strictEqual(count, 1);
            a.value = 4;
            await new Promise(resolve => setTimeout(resolve));

            assert.strictEqual(count, 2);
        });

        it('should not run effect when dependency changes but value is the same', async function () {
            let count = 0;
            const a = new Ref(5);
            const b = new Computed(value => value(a) % 2);

            new Effect((value) => {
                value(b);
                count++;
            });

            assert.strictEqual(count, 1);
            a.value = 3;
            await new Promise(resolve => setTimeout(resolve));

            assert.strictEqual(count, 1);
        });
    });

    describe('async', function () {
        it('should respect async dependencies', async function () {
            let count = 0;
            const a = new Ref(5);
            const b = new Ref(5);

            new Effect(async (value) => {
                value(a);
                await new Promise(resolve => setTimeout(resolve));
                value(b);
                count++;
            });

            await new Promise(resolve => setTimeout(resolve, 10));
            b.value = 4;

            await new Promise(resolve => setTimeout(resolve, 10));
            assert.strictEqual(count, 2);
        });

        it('should abort previous run if dependency changes while running', async function () {
            let count = 0;
            const a = new Ref(5);

            new Effect(async (value, _firstRun, abortSignal) => {
                value(a);
                await new Promise(resolve => setTimeout(resolve));
                assert.strictEqual(abortSignal.aborted, count === 0);
                count++;
            });

            a.value = 4;

            await new Promise(resolve => setTimeout(resolve, 10));
            assert.strictEqual(count, 2);
        });

        it('should not abort if effect completes', async function () {
            let count = 0;
            const a = new Ref(5);

            new Effect(async (value, _firstRun, abortSignal) => {
                value(a);
                await new Promise(resolve => setTimeout(resolve));
                assert.strictEqual(abortSignal.aborted, false);
                count++;
            });

            await new Promise(resolve => setTimeout(resolve, 10));
            a.value = 4;

            await new Promise(resolve => setTimeout(resolve, 10));
            a.value = 3;

            await new Promise(resolve => setTimeout(resolve, 10));
            assert.strictEqual(count, 3);
        });

        it('should not care if promise rejects', async function () {
            let count = 0;
            const a = new Ref(5);

            new Effect(async (value) => {
                value(a);
                await new Promise(resolve => setTimeout(resolve));
                count++;
                throw new Error('Test error');
            });

            await new Promise(resolve => setTimeout(resolve, 10));
            a.value = 4;

            await new Promise(resolve => setTimeout(resolve, 10));
            a.value = 3;

            await new Promise(resolve => setTimeout(resolve, 10));
            assert.strictEqual(count, 3);
        });

        it('should not dispose computed while effect is running', async function () {
            let gate = 0;
            const a = new Ref(5);
            const b = new Computed(() => {
                gate++;
                return 1;
            }, undefined, 0);

            new Effect(async (value) => {
                value(a);
                await new Promise(resolve => setTimeout(resolve, 10));
                value(b);
            });

            await new Promise(resolve => setTimeout(resolve, 20));
            a.value = 4;
            await new Promise(resolve => setTimeout(resolve, 20));

            assert.strictEqual(gate, 1);
        });
    });
});