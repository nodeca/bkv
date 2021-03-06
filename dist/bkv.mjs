/*! bkv 1.0.3 https://github.com/nodeca/bkv @license MIT */
function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly && (symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    })), keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = null != arguments[i] ? arguments[i] : {};
    i % 2 ? ownKeys(Object(source), !0).forEach(function (key) {
      _defineProperty(target, key, source[key]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
  }

  return target;
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  Object.defineProperty(Constructor, "prototype", {
    writable: false
  });
  return Constructor;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

var LlStorage = /*#__PURE__*/function () {
  function LlStorage(namespace) {
    _classCallCheck(this, LlStorage);

    this._ns = "".concat(namespace, "__");
  }

  _createClass(LlStorage, [{
    key: "init",
    value: function init() {
      this._init_promise = this._init_promise || new Promise(function (resolve, reject) {
        try {
          localStorage.setItem('__ls_test__', '__ls_test__');
          localStorage.removeItem('__ls_test__');
          resolve();
        } catch (e) {
          reject(new Error('[BKV.ll_storage] Not available'));
        }
      });
      return this._init_promise;
    }
  }, {
    key: "_remove_sync",
    value: function _remove_sync(key) {
      localStorage.removeItem("".concat(this._ns).concat(key));
    }
  }, {
    key: "remove",
    value: function remove(key) {
      var _this = this;

      return new Promise(function (resolve) {
        return resolve(_this._remove_sync(key));
      });
    }
  }, {
    key: "set",
    value: function set(key, value, expire) {
      var obj = {
        value: value,
        expire: expire
      };

      try {
        localStorage.setItem("".concat(this._ns).concat(key), JSON.stringify(obj));
        return Promise.resolve();
      } catch (e) {
        try {
          // On quota error try to reset storage & try again.
          // Just remove all keys, without conditions, no optimizations needed.
          if (e.name.toUpperCase().indexOf('QUOTA') === -1) throw e;

          for (var _i = 0, _Object$keys = Object.keys(localStorage); _i < _Object$keys.length; _i++) {
            var name = _Object$keys[_i];
            var k = name.split(this._ns)[1];

            if (k) {
              this._remove_sync(k);
            }
          }

          localStorage.setItem("".concat(this._ns).concat(key), JSON.stringify(obj));
          return Promise.resolve();
        } catch (e2) {
          return Promise.reject(e2);
        }
      }
    } // get wrapped object, with expire info

  }, {
    key: "_get_sync",
    value: function _get_sync(key) {
      var str = localStorage.getItem("".concat(this._ns).concat(key));
      if (!str) return {};

      try {
        return JSON.parse(str);
      } catch (_) {// Dim parse errors to avoid failed state
      }

      return {};
    }
  }, {
    key: "get",
    value: function get(key) {
      try {
        return Promise.resolve(this._get_sync(key));
      } catch (e) {
        return Promise.reject(new Error("[BKV.ll_storage] Can't read key: ".concat(key)));
      }
    }
  }, {
    key: "getAll",
    value: function getAll() {
      try {
        var out = [];

        for (var _i2 = 0, _Object$keys2 = Object.keys(localStorage); _i2 < _Object$keys2.length; _i2++) {
          var name = _Object$keys2[_i2];
          var key = name.split(this._ns)[1];
          if (!key) continue;

          var res = this._get_sync(key);

          if (typeof res === 'undefined') continue;
          out.push(_objectSpread2({
            key: key
          }, res));
        }

        return Promise.resolve(out);
      } catch (e) {
        return Promise.reject(e);
      }
    }
  }, {
    key: "clear",
    value: function clear(expiredOnly) {
      try {
        var now = Date.now();

        for (var _i3 = 0, _Object$keys3 = Object.keys(localStorage); _i3 < _Object$keys3.length; _i3++) {
          var name = _Object$keys3[_i3];
          var key = name.split(this._ns)[1];
          if (!key) continue;

          if (!expiredOnly) {
            this._remove_sync(key);

            continue;
          }

          var expire = this._get_sync(key).expire;

          if (expire > 0 && expire - now < 0) {
            this._remove_sync(key);
          }
        }

        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    }
  }]);

  return LlStorage;
}();

var ERR_NS = '[BKV.idb_storage]';

var IdbStorage = /*#__PURE__*/function () {
  function IdbStorage(namespace) {
    _classCallCheck(this, IdbStorage);

    this.namespace = namespace;
  }

  _createClass(IdbStorage, [{
    key: "_test",
    value: function _test() {
      var _this = this;

      function db_delete(indexeddb, name) {
        return new Promise(function (resolve) {
          var req = indexeddb.deleteDatabase(name);

          req.onsuccess = req.onerror = function () {
            resolve();
          };
        });
      }

      return new Promise(function (resolve, reject) {
        var indexeddb;
        var ERR_FAIL = new Error("".concat(ERR_NS, " Not available"));

        try {
          // Firefox throws when cookies disabled
          indexeddb = window.indexedDB;
        } catch (_) {
          reject(ERR_FAIL);
          return;
        }

        if (!indexeddb) {
          reject(ERR_FAIL);
          return;
        }

        _this.widb = indexeddb;
        _this.wikr = window.IDBKeyRange;
        var req;
        var test_db_name = "__bkv_idb_test__".concat(Math.random());

        try {
          req = indexeddb.open(test_db_name);
        } catch (_) {
          reject(ERR_FAIL);
          return;
        }

        req.onerror = function (e) {
          if (req.error && (req.error.name === 'InvalidStateError' || req.error.name === 'UnknownError')) {
            reject(ERR_FAIL);
            e.preventDefault();
          } else {
            resolve();
            if (req.result && req.result.close) req.result.close();
            db_delete(indexeddb, test_db_name); // db_delete(indexeddb, test_db_name).then(() => resolve())
          }
        };

        req.onsuccess = function () {
          resolve();
          req.result.close();
          db_delete(indexeddb, test_db_name); // db_delete(indexeddb, test_db_name).then(() => resolve())
        };
      });
    }
  }, {
    key: "init",
    value: function init() {
      var _this2 = this;

      this._init_promise = this._init_promise || this._test().then(function () {
        return new Promise(function (resolve, reject) {
          var open_req = _this2.widb.open(_this2.namespace, 2
          /* version */
          );

          open_req.onsuccess = function (e) {
            _this2.db = open_req.result;
            resolve();
          };

          open_req.onblocked = function (e) {
            // This should not happen in real world
            reject(new Error("".concat(ERR_NS, " IndexedDB blocked. ").concat(e.target.errorCode)));
          };

          open_req.onerror = function (e) {
            reject(new Error("".concat(ERR_NS, " IndexedDB opening error. ").concat(e.target.errorCode)));
          };

          open_req.onupgradeneeded = function (e) {
            var db = e.target.result;
            if (db.objectStoreNames.contains('kv')) db.deleteObjectStore('kv');
            var store = db.createObjectStore('kv', {
              keyPath: 'key'
            });
            store.createIndex('expire', 'expire', {
              unique: false
            });
          };
        });
      });
      return this._init_promise;
    }
  }, {
    key: "remove",
    value: function remove(key) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        var tx = _this3.db.transaction(['kv'], 'readwrite');

        tx.oncomplete = function () {
          resolve();
        };

        tx.onerror = function (e) {
          reject(e.target);
        };

        tx.objectStore('kv').delete(key);
      });
    }
  }, {
    key: "set",
    value: function set(key, value, expire) {
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        var tx = _this4.db.transaction(['kv'], 'readwrite');

        tx.oncomplete = function () {
          resolve();
        };

        tx.onerror = function (e) {
          reject(e.target);
        };

        tx.objectStore('kv').put({
          key: key,
          value: value,
          expire: expire
        });
      });
    }
  }, {
    key: "get",
    value: function get(key) {
      var _this5 = this;

      return new Promise(function (resolve, reject) {
        var tx = _this5.db.transaction(['kv']);

        tx.onerror = function (e) {
          reject(new Error("".concat(ERR_NS, " Key get error: ").concat(e.target)));
        };

        tx.objectStore('kv').get(key).onsuccess = function (e) {
          resolve(e.target.result || {});
        };
      });
    }
  }, {
    key: "getAll",
    value: function getAll() {
      var _this6 = this;

      return new Promise(function (resolve, reject) {
        var tx = _this6.db.transaction(['kv']);

        tx.onerror = function (e) {
          reject(new Error("".concat(ERR_NS, " Data get error: ").concat(e.target)));
        };

        var out = [];

        tx.objectStore('kv').openCursor().onsuccess = function (e) {
          var cursor = e.target.result;

          if (cursor) {
            out.push(cursor.value);
            cursor.continue();
          } else {
            resolve(out);
          }
        };
      });
    }
  }, {
    key: "clear",
    value: function clear(expiredOnly) {
      var _this7 = this;

      return new Promise(function (resolve, reject) {
        var tx = _this7.db.transaction(['kv'], 'readwrite');

        tx.oncomplete = function () {
          resolve();
        };

        tx.onerror = function (e) {
          reject(new Error("".concat(ERR_NS, " Clear error: ").concat(e.target)));
        };

        var store = tx.objectStore('kv');

        if (expiredOnly) {
          store.index('expire').openCursor(_this7.wikr.bound(1, Date.now())).onsuccess = function (e) {
            var cursor = e.target.result;

            if (cursor) {
              store.delete(cursor.primaryKey);
              cursor.continue();
            }
          };
        } else {
          store.clear();
        }
      });
    }
  }]);

  return IdbStorage;
}();

// Dummy memory store for silent fallback without errors
var zs = Object.create(null);

var ZeroStorage = /*#__PURE__*/function () {
  function ZeroStorage(namespace) {
    _classCallCheck(this, ZeroStorage);

    this._ns = namespace;
    zs[namespace] = zs[namespace] || Object.create(null);
  }

  _createClass(ZeroStorage, [{
    key: "init",
    value: function init() {
      return Promise.resolve();
    }
  }, {
    key: "remove",
    value: function remove(key) {
      delete zs[this._ns][key];
      return Promise.resolve();
    }
  }, {
    key: "set",
    value: function set(key, value, expire) {
      zs[this._ns][key] = {
        value: value,
        expire: expire
      };
      return Promise.resolve();
    }
  }, {
    key: "get",
    value: function get(key) {
      return Promise.resolve(zs[this._ns][key] || {});
    }
  }, {
    key: "getAll",
    value: function getAll() {
      var _this = this;

      var out = [];
      Object.keys(zs[this._ns]).forEach(function (key) {
        out.push(_objectSpread2({
          key: key
        }, zs[_this._ns][key]));
      });
      return Promise.resolve(out);
    }
  }, {
    key: "clear",
    value: function clear(expiredOnly) {
      var now = Date.now();
      if (!expiredOnly) zs[this._ns] = Object.create(null);else {
        for (var _i = 0, _Object$keys = Object.keys(zs[this._ns]); _i < _Object$keys.length; _i++) {
          var key = _Object$keys[_i];
          var expire = zs[this._ns][key].expire;
          if (expire > 0 && expire - now < 0) delete zs[this._ns][key];
        }
      }
      return Promise.resolve();
    }
  }]);

  return ZeroStorage;
}();

var shared_cache = {};
var storages = {
  indexeddb: IdbStorage,
  localstorage: LlStorage,
  zero: ZeroStorage
};
var DEF_STORES = ['indexeddb', 'localstorage', 'zero'];

var BKV = /*#__PURE__*/function () {
  function BKV() {
    var o = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, BKV);

    this._prefix = o.prefix || 'bkv';
    this._allowed_storages = Array.isArray(o.stores) ? o.stores : DEF_STORES; // Validate requested stores names

    for (var i = 0; i < this._allowed_storages.length; i++) {
      var name = this._allowed_storages[i];

      if (!storages[name.toLowerCase()]) {
        throw new Error("[BKV] Wrong requested storage name: '".concat(name, "'"));
      }
    }
  }

  _createClass(BKV, [{
    key: "_init",
    value: function _init() {
      var _this = this;

      var p = Promise.resolve(); // Try to init stores and stop on first succeeded

      this._allowed_storages.forEach(function (name) {
        p = p.then(function (prev) {
          // Skip on success
          if (prev) return true;
          var lc_name = name.toLowerCase();
          _this.storage_name = lc_name;
          _this.storage = new storages[lc_name](_this._prefix);
          return _this.storage.init().then(function () {
            return true;
          }, function () {
            return false;
          });
        });
      });

      return p.then(function (found) {
        if (!found) return Promise.reject(new Error('[BKV] None of requested storages available'));
      });
    }
  }, {
    key: "init",
    value: function init() {
      this._init_promise = this._init_promise || this._init();
      return this._init_promise;
    }
  }, {
    key: "set",
    value: function set(key, value) {
      var _this2 = this;

      var ttl = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      return this.init().then(function () {
        var _expire = ttl ? Date.now() + Math.round(ttl * 1000) : 0;

        return _this2.storage.set(key, value, _expire);
      });
    }
  }, {
    key: "get",
    value: function get(key, default_value) {
      var _this3 = this;

      return this.init().then(function () {
        return _this3.storage.get(key);
      }).then(function (_ref) {
        var expire = _ref.expire,
            value = _ref.value;
        // Not exists => return default
        if (typeof value === 'undefined') return default_value; // Exists & not expired

        if (expire === 0 || expire > 0 && expire > Date.now()) return value; // Expired => force cleanup & return default

        return _this3.clear(true).then(function () {
          return default_value;
        });
      });
    }
  }, {
    key: "getAll",
    value: function getAll() {
      var _this4 = this;

      return this.init().then(function () {
        return _this4.storage.getAll();
      }).then(function (arr) {
        var out = arr.filter(function (d) {
          return d.expire === 0 || d.expire > Date.now();
        }).map(function (d) {
          return {
            key: d.key,
            value: d.value
          };
        });
        if (out.length === arr.length) return out;
        return _this4.clear(true).then(function () {
          return out;
        });
      });
    }
  }, {
    key: "remove",
    value: function remove(key) {
      var _this5 = this;

      if (!Array.isArray(key)) return this.init().then(function () {
        return _this5.storage.remove(key);
      }); // Multiple keys

      return Promise.all(key.map(function (k) {
        return _this5.remove(k);
      }));
    }
  }, {
    key: "clear",
    value: function clear(expiredOnly) {
      var _this6 = this;

      return this.init().then(function () {
        return _this6.storage.clear(expiredOnly);
      });
    }
  }], [{
    key: "storages",
    get: function get() {
      return storages;
    }
  }, {
    key: "shared",
    value: function shared() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var key = JSON.stringify(options, Object.keys(options).sort());
      shared_cache[key] = shared_cache[key] || new BKV(options);
      return shared_cache[key];
    }
  }, {
    key: "create",
    value: function create() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      return new BKV(options);
    }
  }]);

  return BKV;
}();

export { BKV as default };
