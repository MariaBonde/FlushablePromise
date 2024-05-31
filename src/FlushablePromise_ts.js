"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var aggregate_error_1 = require("aggregate-error");
var FlushablePromise = /** @class */ (function () {
  /**
   * @param onFlush: Function returning the value the promise should resolve with when ``flush`` is called
   */
  function FlushablePromise(onFlush) {
    var _this = this;
    this._promise = new Promise(function (resolve, reject) {
      _this.resolve = function (v) {
        resolve(v);
      };
      _this.reject = function (e) {
        reject(e);
      };
    });
    if (onFlush) {
      this._fetchValue = onFlush;
    }
  }
  /**
   * Method to chain a promise with fulfill- and reject-reactions.
   *
   * @param onFulfilled: The function executed when the promise ``then`` is called on gets resolved. Returns the value the new promise gets resolved with.
   * @param onRejected: The function executed when the promise ``then`` is called on is rejected. Returns the value the new promise gets rejected with.
   * @returns a new promise dependent on the promise ``then``was called on
   */
  FlushablePromise.prototype.then = function (onFulfilled, onRejected) {
    var _this = this;
    var newPromise = new FlushablePromise();
    newPromise._setSourcePromise(this);
    this._promise.then(
      function (x) {
        var fulfilledVal = onFulfilled(x);
        if (fulfilledVal instanceof FlushablePromise) {
          fulfilledVal._setSourcePromise(_this);
          newPromise._setSourcePromise(fulfilledVal);
          fulfilledVal.resolve(x);
          return newPromise.resolve(fulfilledVal);
        } else {
          return newPromise.resolve(fulfilledVal);
        }
      },
      function (y) {
        if (onRejected) {
          var rejectedVal = onRejected(y);
          if (rejectedVal instanceof FlushablePromise) {
            rejectedVal._setSourcePromise(_this);
            newPromise._setSourcePromise(rejectedVal);
            rejectedVal.reject(y);
            return newPromise.resolve(rejectedVal);
          } else {
            return newPromise.resolve(rejectedVal);
          }
        } else {
          return newPromise.reject(y);
        }
      }
    );
    return newPromise;
  };
  /**
   * Method used to "catch" an error, normally at the end of a promise chain
   *
   * @param onRejected the function to handle a value sent from a rejected promise
   * @returns a new pending promise
   */
  FlushablePromise.prototype.catch = function (onRejected) {
    return this.then(function (x) {
      return x;
    }, onRejected);
  };
  /**
   * Method to schedule a function to be called when a promise is settled
   *
   * @param onFinally: A function executed when the promise settles
   * @returns a new pending promise, to be settled with the same value as the current promise
   */
  FlushablePromise.prototype.finally = function (onFinally) {
    if (typeof onFinally != "function") {
      return this.then(onFinally, onFinally);
    } else {
      return this.then(
        function (value) {
          return FlushablePromise.resolve(onFinally()).then(function () {
            return value;
          });
        },
        function (reason) {
          return FlushablePromise.resolve(onFinally()).then(function () {
            throw reason;
          });
        }
      );
    }
  };
  /**
   * Method to flush promise chain, will resolve promise with ``onFlush`` function, or call itself recursively on the source promise.
   */
  FlushablePromise.prototype.flush = function () {
    if (this._fetchValue) {
      this.resolve(this._fetchValue());
    } else if (this._sourcePromise) {
      this._sourcePromise.forEach(function (flushable) {
        return flushable.flush();
      });
    }
  };
  /**
   * Method to set source promise(s) of new promise.
   *
   * @param sourcePromise: The preceding promise in a promise chain
   */
  FlushablePromise.prototype._setSourcePromise = function (sourcePromise) {
    this._sourcePromise = [sourcePromise];
  };
  /**
   * Method to add new source promises to existing source promises.
   *
   * @param sourcePromise
   */
  FlushablePromise.prototype._setSourcePromises = function (sourcePromise) {
    if (!this._sourcePromise) {
      this._sourcePromise = sourcePromise;
    } else {
      this._sourcePromise = this._sourcePromise.concat(sourcePromise);
    }
  };
  /**
   * Method to resolve a promise with the values of several promises once they are resolved.
   *
   * @param promiseList: A list of flushable promises.
   * @returns a new promise either resolved with a list of the promiseList's resolved values, or a promise rejected with the first promise of promiseList that got rejected.
   */
  FlushablePromise.all = function (promiseList) {
    var counter = promiseList.length;
    var arr = [];
    var promise = new FlushablePromise();
    promise._setSourcePromises(promiseList);
    var _loop_1 = function (i) {
      promiseList[i].then(
        function (v) {
          arr[i] = v;
          if (--counter == 0) {
            promise.resolve(arr);
          }
        },
        function (a) {
          return promise.reject(a);
        }
      );
    };
    for (var i = 0; i < counter; i++) {
      _loop_1(i);
    }
    return promise;
  };
  /**
   * Method to create a promise settled with the value of the first promise of a list of promises to settle.
   *
   * @param promiseList: A list of flushable promises.
   * @returns a promise settled with the value of the first promise to settle.
   */
  FlushablePromise.race = function (promiseList) {
    var promise = new FlushablePromise();
    promise._setSourcePromises(promiseList);
    promiseList.forEach(function (p) {
      return p.then(
        function (v) {
          return promise.resolve(v);
        },
        function (e) {
          return promise.reject(e);
        }
      );
    });
    return promise;
  };
  /**
   * Method to create a promise fulfilled with the value of the first promise of a list of promises to get resolved.
   *
   * @param promiseList: A list of flushable promises.
   * @returns a promise either resolved with the value of the first promise to resolve, or rejected with a list of values from the rejected promises.
   */
  FlushablePromise.any = function (promiseList) {
    var promise = new FlushablePromise();
    var rejects = [];
    promise._setSourcePromises(promiseList);
    promiseList.forEach(function (p) {
      return p.then(
        function (v) {
          return promise.resolve(v);
        },
        function (e) {
          rejects.push(e);
          if (rejects.length == promiseList.length) {
            promise.reject(new aggregate_error_1.default(rejects));
          }
        }
      );
    });
    return promise;
  };
  /**
   * Method to create a new resolved promise.
   *
   * @param value to resolve the new promise with.
   * @returns a promise resolved with the value, or if value is a flushable promise, we return the value.
   */
  FlushablePromise.resolve = function (value) {
    if (value instanceof FlushablePromise) {
      return value;
    }
    var promise = new FlushablePromise();
    promise.resolve(value);
    return promise;
  };
  /**
   * Method to create a new rejected promise.
   *
   * @param value to reject the new promise with.
   * @returns a promise rejected with the value passed as an argument.
   */
  FlushablePromise.reject = function (value) {
    var promise = new FlushablePromise();
    promise.reject(value);
    return promise;
  };
  return FlushablePromise;
})();
exports.default = FlushablePromise;
