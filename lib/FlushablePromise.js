export default class FlushablePromise {
  /**
   * @param onFlush: Function returning the value the promise should resolve with when ``flush`` is called
   */
  constructor(onFlush) {
    let { promise, resolve, reject } = Promise.withResolvers();
    [this._promise, this.resolve, this.reject] = [promise, resolve, reject];
    if (onFlush) {
      this._fetchValue = onFlush;
    }
  }
  get promise() {
    return this._promise;
  }

  /**
   * Method to chain a promise with fulfill- and reject-reactions.
   *
   * @param onFulfilled: The function called when the promise ``then`` is called on gets resolved. Returns the value the new promise gets resolved with.
   * @param onRejected: The function called when the promise ``then`` is called on is rejected. Returns the value the new promise gets rejected with.
   * @returns a new promise dependent on the promise ``then``was called on
   */
  then(onFulfilled, onRejected) {
    let newPromise = new FlushablePromise();
    newPromise._setSourcePromise(this);
    this._promise.then(
      (x) => {
        let fulfilledVal = onFulfilled(x);
        if (fulfilledVal instanceof FlushablePromise) {
          fulfilledVal._setSourcePromise(this);
          newPromise._setSourcePromise(fulfilledVal);
          fulfilledVal.resolve(x);
          return newPromise.resolve(fulfilledVal);
        } else {
          return newPromise.resolve(fulfilledVal);
        }
      },
      (y) => {
        if (onRejected) {
          let rejectedVal = onRejected(y);
          if (rejectedVal instanceof FlushablePromise) {
            rejectedVal._setSourcePromise(this);
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
  }

  /**
   * Method used to "catch" an error, normally at the end of a promise chain
   *
   * @param onRejected the function to handle a value sent from a rejected promise
   * @returns a new pending promise
   */
  catch(onRejected) {
    return this.then((x) => x, onRejected);
  }

  /**
   * Method to schedule a function to be called when a promise is settled
   *
   * @param onFinally: A function executed when the promise settles
   * @returns a new pending promise, to be settled with the same value as the current promise
   */
  finally(onFinally) {
    if (typeof onFinally != "function") {
      return this.then(onFinally, onFinally);
    } else {
      return this.then(
        (value) => FlushablePromise.resolve(onFinally()).then(() => value),
        (reason) =>
          FlushablePromise.resolve(onFinally()).then(() => {
            throw reason;
          })
      );
    }
  }

  /**
   * Method to flush promise chain, will resolve promise with ``onFlush`` function, or call itself recursively on the source promise.
   */
  flush() {
    if (this._fetchValue) {
      this.resolve(this._fetchValue());
    } else if (this._sourcePromise) {
      this._sourcePromise.forEach((flushable) => flushable.flush());
    }
  }

  /**
   * Method to set source promise(s) of new promise.
   *
   * @param sourcePromise: The preceding promise in a promise chain
   */
  _setSourcePromise(sourcePromise) {
    this._sourcePromise = [sourcePromise];
  }

  /**
   * Method to add new source promises to existing source promises.
   *
   * @param sourcePromise
   */
  _setSourcePromises(sourcePromise) {
    if (!this._sourcePromise) {
      this._sourcePromise = sourcePromise;
    } else {
      this._sourcePromise = this._sourcePromise.concat(sourcePromise);
    }
  }

  /**
   * Method to resolve a promise with the values of several promises once they are resolved.
   *
   * @param promiseList: A list of flushable promises.
   * @returns a new promise either resolved with a list of the promiseList's resolved values, or a promise rejected with the first promise of promiseList that got rejected.
   */
  static all(promiseList) {
    let counter = promiseList.length;
    let arr = [];
    let promise = new FlushablePromise();
    promise._setSourcePromises(promiseList);
    for (let i = 0; i < counter; i++) {
      promiseList[i].then(
        (v) => {
          arr[i] = v;
          if (--counter == 0) {
            promise.resolve(arr);
          }
        },
        (a) => promise.reject(a)
      );
    }
    return promise;
  }

  /**
   * Method to create a promise settled with the value of the first promise of a list of promises to settle.
   *
   * @param promiseList: A list of flushable promises.
   * @returns a promise settled with the value of the first promise to settle.
   */
  static race(promiseList) {
    let promise = new FlushablePromise();
    promise._setSourcePromises(promiseList);
    promiseList.forEach((p) =>
      p.then(
        (v) => promise.resolve(v),
        (e) => promise.reject(e)
      )
    );
    return promise;
  }

  /**
   * Method to create a promise fulfilled with the value of the first promise of a list of promises to get resolved.
   *
   * @param promiseList: A list of flushable promises.
   * @returns a promise either resolved with the value of the first promise to resolve, or rejected with a list of values from the rejected promises.
   */
  static any(promiseList) {
    let promise = new FlushablePromise();
    let rejects = [];
    promise._setSourcePromises(promiseList);
    promiseList.forEach((p) =>
      p.then(
        (v) => promise.resolve(v),
        (e) => {
          rejects.push(e);
          if (rejects.length == promiseList.length) {
            promise.reject(new AggregateError(rejects));
          }
        }
      )
    );
    return promise;
  }

  /**
   * Method to create a new resolved promise.
   *
   * @param value to resolve the new promise with.
   * @returns a promise resolved with the value, or if value is a flushable promise, we return the value.
   */
  static resolve(value) {
    if (value instanceof FlushablePromise) {
      return value;
    }
    let promise = new FlushablePromise();
    promise.resolve(value);
    return promise;
  }

  /**
   * Method to create a new rejected promise.
   *
   * @param value to reject the new promise with.
   * @returns a promise rejected with the value passed as an argument.
   */
  static reject(value) {
    let promise = new FlushablePromise();
    promise.reject(value);
    return promise;
  }
}
