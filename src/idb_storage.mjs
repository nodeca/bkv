const ERR_NS = '[BKV.idb_storage]'


class IdbStorage {

  constructor (namespace) {
    this.namespace = namespace
  }

  _test () {
    function db_delete (indexeddb, name) {
      return new Promise(resolve => {
        const req = indexeddb.deleteDatabase(name)
        req.onsuccess = req.onerror = () => { resolve() }
      })
    }

    return new Promise((resolve, reject) => {
      let indexeddb
      const ERR_FAIL = new Error(`${ERR_NS} Not available`)

      try {
        // Firefox throws when cookies disabled
        indexeddb = window.indexedDB
      } catch (_) {
        reject(ERR_FAIL)
        return
      }

      if (!indexeddb) {
        reject(ERR_FAIL)
        return
      }

      this.widb = indexeddb
      this.wikr = window.IDBKeyRange

      let req
      const test_db_name = '__idb_test__'

      try {
        req = indexeddb.open(test_db_name)
      } catch (_) {
        reject(ERR_FAIL)
        return
      }

      req.onerror = e => {
        if (req.error && (req.error.name === 'InvalidStateError' || req.error.name === 'UnknownError')) {
          reject(ERR_FAIL)
          e.preventDefault()
        } else {
          resolve()
          if (req.result && req.result.close) req.result.close()
          db_delete(indexeddb, test_db_name)
          // db_delete(indexeddb, test_db_name).then(() => resolve())
        }
      }

      req.onsuccess = () => {
        resolve()
        req.result.close()
        db_delete(indexeddb, test_db_name)
        // db_delete(indexeddb, test_db_name).then(() => resolve())
      }
    })
  }

  init () {
    this._init_promise = this._init_promise || this._test().then(() =>
      new Promise((resolve, reject) => {
        const open_req = this.widb.open(this.namespace, 2 /* version */)

        open_req.onsuccess = e => {
          this.db = open_req.result
          resolve()
        }
        open_req.onblocked = e => {
          // This should not happen in real world
          reject(new Error(`${ERR_NS} IndexedDB blocked. ${e.target.errorCode}`))
        }
        open_req.onerror = e => {
          reject(new Error(`${ERR_NS} IndexedDB opening error. ${e.target.errorCode}`))
        }
        open_req.onupgradeneeded = e => {
          const db = e.target.result

          if (db.objectStoreNames.contains('kv')) db.deleteObjectStore('kv')

          const store = db.createObjectStore('kv', { keyPath: 'key' })
          store.createIndex('expire', 'expire', { unique: false })
        }
      })
    )

    return this._init_promise
  }

  remove (key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['kv'], 'readwrite')

      tx.oncomplete = () => { resolve() }
      tx.onerror = e => { reject(e.target) }

      tx.objectStore('kv').delete(key)
    })
  }

  set (key, value, expire) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['kv'], 'readwrite')

      tx.oncomplete = () => { resolve() }
      tx.onerror = e => { reject(e.target) }

      tx.objectStore('kv').put({ key, value, expire })
    })
  }

  get (key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['kv'])

      tx.onerror = e => { reject(new Error(`${ERR_NS} Key get error: ${e.target}`)) }
      tx.objectStore('kv').get(key).onsuccess = e => { resolve(e.target.result || {}) }
    })
  }

  clear (expiredOnly) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['kv'], 'readwrite')

      tx.oncomplete = () => { resolve() }
      tx.onerror = e => { reject(new Error(`${ERR_NS} Clear error: ${e.target}`)) }

      const store = tx.objectStore('kv')

      if (expiredOnly) {
        store.index('expire').openCursor(this.wikr.bound(1, Date.now())).onsuccess = e => {
          const cursor = e.target.result
          if (cursor) {
            store.delete(cursor.primaryKey)
            cursor.continue()
          }
        }
      } else {
        store.clear()
      }
    })
  }
}

export default IdbStorage
