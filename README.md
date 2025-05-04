# Purpose

This library is inspired by Vue.js implementation of reactivity. You can familiarize with the concept of reactivity [here](https://vuejs.org/guide/extras/reactivity-in-depth.html). Short excerpt:

> Reactivity is a programming paradigm that allows us to adjust to changes in a declarative manner.

However Vue.js reactivity is limited to synchronous computation. This library solves this limitation and supports both - synchronous and asynchronous computation.

You can familiarize with sample use [here](https://github.com/donatas-luciunas/async-reactivity-sample).

# Concepts

We refer to values of many variables as "state".

We refer to values of many reactive variables as "reactive state".

For **reactive state** to be **reactive** dependencies need to be tracked. So it is easier to think about reactive state as a dependency graph (for example A → B → C). Here A → B means:
* A depends on B
* B is [dependency](./src/dependency.ts)
* A is [dependent](./src/dependent.ts)

There are few types of reactive variables:

* [ref](./src/ref.ts)
  * simply stores a given value (Vue.js `shallowRef` equivalent)
  * can only be dependency (only incoming arrows)
* [computed](./src/computed.ts)
  * defined by pure function (Vue.js `computed` equivalent)
  * can be both - dependent and dependency (incoming and outgoing arrows)

To integrate state with reactive state you can use:
* [listener](./src/listener.ts)
  * inherits `ref`
    * can only be dependency (only incoming arrows)
  * `start` function is called when listener gets first dependent
    * it ensures value is updated
  * `stop` function is called when listener loses last dependent
* [watcher](./src/watcher.ts)
  * a function that is called when dependency changes
  * can only be dependent (only outgoing arrows)

# Behavior

You can familiarize with behavior by reading tests.