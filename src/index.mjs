// Adapters for Store class

import LlStorage from './ll_storage.mjs'
import IdbStorage from './idb_storage.mjs'
import ZeroStorage from './zero_storage.mjs'

const shared_cache = {}

const storages = {
  indexeddb: IdbStorage,
  localstorage: LlStorage,
  zero: ZeroStorage
}

const DEF_STORES = ['indexeddb', 'localstorage', 'zero']

class BKV {
  constructor (o = {}) {
    this._prefix = o.prefix || 'bkv'
    this._allowed_storages = Array.isArray(o.stores) ? o.stores : DEF_STORES

    // Validate requested stores names
    for (let i = 0; i < this._allowed_storages.length; i++) {
      const name = this._allowed_storages[i]
      if (!storages[name.toLowerCase()]) {
        throw new Error(`[BKV] Wrong requested storage name: '${name}'`)
      }
    }
  }

  _init () {
    let p = Promise.resolve()

    // Try to init stores and stop on first succeeded
    this._allowed_storages.forEach(name => {
      p = p.then(prev => {
        // Skip on success
        if (prev) return true

        const lc_name = name.toLowerCase()
        this.storage_name = lc_name
        this.storage = new storages[lc_name](this._prefix)

        return this.storage.init().then(() => true, () => false)
      })
    })

    return p.then(found => {
      if (!found) return Promise.reject(new Error('[BKV] None of requested storages available'))
    })
  }

  init () {
    this._init_promise = this._init_promise || this._init()
    return this._init_promise
  }

  set (key, value, ttl = 0) {
    return this.init().then(() => {
      const _expire = ttl ? Date.now() + Math.round(ttl * 1000) : 0
      return this.storage.set(key, value, _expire)
    })
  }

  get (key, default_value) {
    return this.init()
      .then(() => this.storage.get(key))
      .then(({ expire, value }) => {
        // Not exists => return default
        if (typeof value === 'undefined') return default_value
        // Exists & not expired
        if (expire === 0 || (expire > 0 && expire > Date.now())) return value
        // Expired => force cleanup & return default
        return this.clear(true).then(() => default_value)
      })
  }

  getAll () {
    return this.init()
      .then(() => this.storage.getAll())
      .then(arr => {
        const out = arr
          .filter(d => d.expire === 0 || d.expire > Date.now())
          .map(d => ({ key: d.key, value: d.value }))

        if (out.length === arr.length) return out
        return this.clear(true).then(() => out)
      })
  }

  remove (key) {
    return this.init().then(() => this.storage.remove(key))
  }

  clear (expiredOnly) {
    return this.init().then(() => this.storage.clear(expiredOnly))
  }

  static get storages () { return storages }

  static shared (options = {}) {
    const key = JSON.stringify(options, Object.keys(options).sort())

    shared_cache[key] = shared_cache[key] || new BKV(options)
    return shared_cache[key]
  }

  static create (options = {}) {
    return new BKV(options)
  }
}

export default BKV
