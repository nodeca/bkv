// Dummy memory store for silent fallback without errors

const zs = Object.create(null)

class ZeroStorage {

  constructor (namespace) {
    this._ns = namespace
    zs[namespace] = zs[namespace] || Object.create(null)
  }

  init () { return Promise.resolve() }

  remove (key) {
    delete zs[this._ns][key]
    return Promise.resolve()
  }

  set (key, value, expire) {
    zs[this._ns][key] = { value, expire }
    return Promise.resolve()
  }

  get (key) {
    return Promise.resolve(zs[this._ns][key] || {})
  }

  getAll () {
    const out = []
    Object.keys(zs[this._ns]).forEach(key => {
      out.push({ key, ...zs[this._ns][key] })
    })
    return Promise.resolve(out)
  }

  clear (expiredOnly) {
    const now = Date.now()

    if (!expiredOnly) zs[this._ns] = Object.create(null)
    else {
      for (const key of Object.keys(zs[this._ns])) {
        const expire = zs[this._ns][key].expire
        if (expire > 0 && (expire - now) < 0) delete zs[this._ns][key]
      }
    }

    return Promise.resolve()
  }
}

export default ZeroStorage
