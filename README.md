bkv - simple KV storage for browsers
===========================================

[![CI](https://github.com/nodeca/bkv/actions/workflows/ci.yml/badge.svg)](https://github.com/nodeca/bkv/actions/workflows/ci.yml)
[![NPM version](https://img.shields.io/npm/v/bkv.svg)](https://www.npmjs.org/package/bkv)

> __bkv__ is browser persistent key/value storage with simple interface. It
supports actual IndexedDB / localStorage. With silent fallback to memory store
for error-less work (optional).

__Install__

```bash
npm install bkv --save
```


Examples
--------

```js
const bkv = new window.BKV()

await bkv.set('dolorem', { lorem: 'ipsum' })

const data = await bkv.get('dolorem')
console.log(`Loaded: ${data}`)

await bkv.remove('dolorem'));
```


API
---

__Note__, all methods with optional callbacks will return promises if callback
is not set.


### new BKV([options])

Options:

- `prefix` - Data namespace. Default - `bkv`. Used to separate data for
   multiple instances, if required.
- `stores` - Array of storage names to use, ordered by preference.
  Default `['indexeddb', 'localstorage', 'zero']`. Set to `['indexeddb', 'localstorage']` if no fallback to memory required.

\* `zero` is simple memory store for silent fallback when no persistent storages available.


### .get(key [, default]) => Promise

Load data by `key` name. If not exists - returns `default` (if passed) or `undefined`.


### .getAll() => Promise

Load all data from storage as `[ { key, value }, { key, value }, ... ]`.


### .set(key, data [, ttl]) => Promise

Put data into storage under `key` name.

- `key` - String to address data.
- `data` - serializable JS object to store.
- `ttl` - Expiration time in seconds. Default = 0 (don't expire).


### .remove(key | [keys]) => Promise

Remove `key` data from store. If `Array` passed - remove all listed keys.


### .clear([expiredOnly]) => Promise

Clear all storage data (in your namespace), or just expired objects when called
with `true` param.


### .init() => Promise

Auto-executed on first call of any method. Usually not needed. But may be used,
if you need exact info about availability of persistent storage, prior to start.


### .create(options)

Alias of `new BKV(options)`


### .shared(options)

Similar to `.create()` but returns the same (cached) instance for the same
options. Useful if you need BKV in multiple modules, and don't wish to
initialize it every time.
