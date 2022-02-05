describe('extra tests', function () {
  class FailingStorage {
    init () { return Promise.reject(new Error('failed to init')) }
  }

  BKV.storages.failing = FailingStorage

  describe('API', () => {
    it('use storage by priority', async () => {
      const b  = new BKV({ stores: ['failing', 'localstorage'] })
      const b1 = new BKV({ stores: ['localstorage', 'failing'] })

      await b.set('ls_test', 'ls_test')
      assert.strictEqual(await b1.get('ls_test'), 'ls_test')

      await b.clear()

      assert.strictEqual(b.storage_name, 'localstorage')
      assert.strictEqual(b1.storage_name, 'localstorage')
    })

    it('should fail with failing storages', async () => {
      const b  = new BKV({ stores: ['failing'] })

      await b.set('ls_test', 'ls_test').then(
        () => { assert.fail('should reject') },
        err => { assert.match(err, /None of requested storages available/) }
      )
    })

    it('should fail on bad storage names', async () => {

      assert.throws(
        () => new BKV({ stores: ['bad_name'] }),
        /Wrong requested storage name/
      )

    })

    it('.shared() should return the same instance for the same options', () => {
      const b1 = BKV.shared()
      const b2 = BKV.shared()
      assert.strictEqual(b1, b2)

      const b3 = BKV.shared({ prefix: 'foo', stores: ['localstorage', 'indexeddb'] })
      const b4 = BKV.shared({ stores: ['localstorage', 'indexeddb'], prefix: 'foo' })
      assert.strictEqual(b3, b4)
    })
  })

  describe('localstorage extras', () => {

    // this test will fail on Electron because they don't have a limit on localStorage, see
    // https://github.com/electron/electron/issues/8337
    it('reset localstorage (namespace) when quota exceeded (2.5-5Mb)', async () => {
      const b = new BKV({ stores: ['localstorage'] })

      // create big data (>5mb in json)
      const huge = new Array(1000000)
      for (let i = 0, l = huge.length; i < l; i++) huge[i] = '1234567890'

      await b.set('permanent', 'permanent')
      assert.strictEqual(await b.get('permanent'), 'permanent')

      try {
        await b.set('huge', huge)
      } catch (_) {}

      assert.isUndefined(await b.get('permanent'))

      await b.clear()
    })

    it('test namespace (only for localStorage)', async () => {
      const b = new BKV({ prefix: 'ns', stores: ['localstorage'] })

      await b.set('key', 'value')

      assert.ok(localStorage.ns__key)
      const val = JSON.parse(localStorage.ns__key).value
      assert.strictEqual(val, 'value')

      await b.clear()
    })
  })
})
