const stores_map = {
  localstorage: 'localStorage',
  indexeddb: 'IndexedDB',
  zero: 'zero storage'
}

Object.keys(stores_map).forEach(storage_name => {
  describe(`${stores_map[storage_name]} tests`, function () {

    const bkv = BKV.create({ stores: [storage_name], prefix: 'bkv_test' })

    const key = 'test_key'
    const key2 = 'test_key2'
    const obj = { lorem: 'imsum', dolorem: 'casum' }
    const obj2 = { tratum: 'curem', lafem: 'pendum' }

    before(() => bkv.clear())

    after(() => bkv.clear())

    it('key set', async () => {
      await bkv.set(key, obj)
    })

    it('key get', async () => {
      assert.deepEqual(await bkv.get(key), obj)
    })

    it('get default', async () => {
      assert.deepEqual(await bkv.get('missed', 'foo'), 'foo')
    })

    it('key update', async () => {
      await bkv.set(key, obj2)
      assert.deepEqual(await bkv.get(key), obj2)
    })

    it('key remove', async () => {
      await bkv.remove(key)
      assert.isUndefined(await bkv.get(key))
    })

    it('remove not existing key', async () => {
      await bkv.remove(`foobar${Math.random()}`)
    })

    it('remove multiple keys', async () => {
      await bkv.set(key, obj)
      await bkv.set(key2, obj2)
      assert.deepEqual(await bkv.get(key), obj)
      assert.deepEqual(await bkv.get(key2), obj2)
      await bkv.remove([key, key2])
      assert.isUndefined(await bkv.get(key))
      assert.isUndefined(await bkv.get(key2))
    })


    it('persistance', async () => {
      await bkv.set(key, obj)
      await bkv.clear(true)
      assert.deepEqual(await bkv.get(key), obj)
    })

    it('clear', async () => {
      await bkv.set(key, obj)
      await bkv.clear()
      assert.isUndefined(await bkv.get(key))
    })

    function pTimeout (ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    }

    it('clear expired only', async () => {
      await bkv.set(key, obj, 1)
      await pTimeout(10)
      await bkv.clear(true)
      assert.deepEqual(await bkv.get(key), obj)
    })

    it('clear expired', async () => {
      await bkv.set(key, obj, 0.005)
      await pTimeout(10)
      await bkv.clear(true)
      assert.isUndefined(await bkv.get(key))
    })

    it('get should clear expired', async () => {
      await bkv.set(key, obj, 0.005)
      await bkv.set(key2, obj2)
      await pTimeout(10)

      assert.strictEqual(await bkv.get(key, 5), 5)
      assert.deepEqual(await bkv.get(key2, 5), obj2)
    })

    it('namespaces', async () => {
      const b1 = BKV.create({ prefix: 'bkv_test_ns1', stores: [storage_name] })
      const b2 = BKV.create({ prefix: 'bkv_test_ns2', stores: [storage_name] })

      await b1.set('foo', 'bar')
      assert.strictEqual(await b1.get('foo'), 'bar')
      assert.isUndefined(await b2.get('foo'))

      await b2.set('foo', 'rab')
      assert.strictEqual(await b2.get('foo'), 'rab')
      assert.strictEqual(await b1.get('foo'), 'bar')

      await b1.clear()
      await b2.clear()
    })

    it('get all keys', async () => {
      await bkv.clear()

      await bkv.set(key, obj)
      await bkv.set(key2, obj2)

      const res = await bkv.getAll()

      const expected = [
        { key: key, value: obj },
        { key: key2, value: obj2 }
      ]

      assert.deepEqual(res.sort((o1, o2) => o1.key.localeCompare(o2.key)), expected)

      await bkv.clear()
    })

    it('get all keys except expired', async () => {
      await bkv.clear()

      await bkv.set(key, obj)
      await bkv.set(key2, obj2, 0.005)

      await pTimeout(10)
      const res = await bkv.getAll()

      assert.deepEqual(res, [{ key: key, value: obj }])

      await bkv.clear()
    })

  })
})
