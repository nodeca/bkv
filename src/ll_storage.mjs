class LlStorage {

  constructor (namespace) {
    this._ns = `${namespace}__`
  }

  init () {
    this._init_promise = this._init_promise || new Promise((resolve, reject) => {
      try {
        localStorage.setItem('__ls_test__', '__ls_test__')
        localStorage.removeItem('__ls_test__')
        resolve()
      } catch (e) {
        reject(new Error('[BKV.ll_storage] Not available'))
      }
    })

    return this._init_promise
  }

  _remove_sync (key) {
    localStorage.removeItem(`${this._ns}${key}`)
  }

  remove (key) {
    return new Promise(resolve => resolve(this._remove_sync(key)))
  }

  set (key, value, expire) {
    const obj = { value, expire }

    try {
      localStorage.setItem(`${this._ns}${key}`, JSON.stringify(obj))
      return Promise.resolve()
    } catch (e) {

      try {
        // On quota error try to reset storage & try again.
        // Just remove all keys, without conditions, no optimizations needed.
        if (e.name.toUpperCase().indexOf('QUOTA') === -1) throw e

        for (const name of Object.keys(localStorage))  {
          const k = name.split(this._ns)[1]
          if (k) { this._remove_sync(k) }
        }
        localStorage.setItem(`${this._ns}${key}`, JSON.stringify(obj))
        return Promise.resolve()
      } catch (e2) {
        return Promise.reject(e2)
      }
    }
  }

  // get wrapped object, with expire info
  _get_sync (key) {
    const str = localStorage.getItem(`${this._ns}${key}`)
    if (!str) return {}

    try {
      return JSON.parse(str)
    } catch (_) {
      // Dim parse errors to avoid failed state
    }

    return {}
  }

  get (key) {
    try {
      return Promise.resolve(this._get_sync(key))
    } catch (e) {
      return Promise.reject(new Error(`[BKV.ll_storage] Can't read key: ${key}`))
    }
  }

  clear (expiredOnly) {
    try {
      const now = Date.now()

      for (const name of Object.keys(localStorage)) {
        const key = name.split(this._ns)[1]

        if (!key) continue

        if (!expiredOnly) {
          this._remove_sync(key)
          continue
        }

        const expire = this._get_sync(key).expire
        if ((expire > 0) && ((expire - now) < 0)) {
          this._remove_sync(key)
        }
      }
      return Promise.resolve()
    } catch (e) {
      return Promise.reject(e)
    }
  }
}

export default LlStorage
