import AggregateError from "aggregate-error";
export default class FlushablePromise {
    /**
     * @param onFlush: Function returning the value the promise should resolve with when ``flush`` is called
     */
    constructor(onFlush) {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = (v) => {
                resolve(v);
            };
            this.reject = (e) => {
                reject(e);
            };
        });
        if (onFlush) {
            this.fetchValue = onFlush;
        }
        this.precedingPromises = [];
    }
    /**
     * Method to chain a promise with fulfill- and reject-reactions.
     *
     * @param onFulfilled: The function executed when the promise ``then`` is called on gets resolved. Returns the value the new promise gets resolved with.
     * @param onRejected: The function executed when the promise ``then`` is called on is rejected. Returns the value the new promise gets rejected with.
     * @returns a new promise dependent on the promise ``then``was called on
     */
    then(onFulfilled, onRejected) {
        var newPromise = new FlushablePromise();
        newPromise.setPrecedingPromise(this);
        this.promise.then((x) => {
            let fulfilledVal = onFulfilled(x);
            if (fulfilledVal instanceof FlushablePromise) {
                fulfilledVal.setPrecedingPromise(this);
                newPromise.setPrecedingPromise(fulfilledVal);
                fulfilledVal.resolve(x);
                return newPromise.resolve(fulfilledVal);
            }
            else {
                return newPromise.resolve(fulfilledVal);
            }
        }, (y) => {
            if (onRejected) {
                let rejectedVal = onRejected(y);
                if (rejectedVal instanceof FlushablePromise) {
                    rejectedVal.setPrecedingPromise(this);
                    newPromise.setPrecedingPromise(rejectedVal);
                    rejectedVal.reject(y);
                    return newPromise.resolve(rejectedVal);
                }
                else {
                    return newPromise.resolve(rejectedVal);
                }
            }
            else {
                return newPromise.reject(y);
            }
        });
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
        }
        else {
            return this.then((value) => FlushablePromise.resolve(onFinally()).then(() => value), (reason) => FlushablePromise.resolve(onFinally()).then(() => {
                throw reason;
            }));
        }
    }
    /**
     * Method to flush promise chain, will resolve promise with ``onFlush`` function, or call itself recursively on the preceding promise.
     */
    flush() {
        if (this.fetchValue) {
            this.resolve(this.fetchValue());
        }
        else {
            this.precedingPromises.forEach((flushable) => flushable.flush());
        }
    }
    /**
     * Method to set preceding promise(s) of new promise.
     *
     * @param precedingPromise: The preceding promise in a promise chain
     */
    setPrecedingPromise(precedingPromise) {
        this.precedingPromises.push(precedingPromise);
    }
    /**
     * Method to add new preceding promises to existing preceding promises.
     *
     * @param precedingPromise
     */
    /*   private setPrecedingPromises(precedingPromise: FlushablePromise<any>[]): void {
        if (!this.precedingPromises) {
          this.precedingPromises = precedingPromise;
        } else {
          this.precedingPromises = this.precedingPromises.concat(precedingPromise);
        }
      } */
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
        promiseList.map((p) => promise.setPrecedingPromise(p));
        for (let i = 0; i < counter; i++) {
            promiseList[i].then((v) => {
                arr[i] = v;
                if (--counter == 0) {
                    promise.resolve(arr);
                }
            }, (a) => promise.reject(a));
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
        promiseList.map((p) => promise.setPrecedingPromise(p));
        promiseList.forEach((p) => p.then((v) => promise.resolve(v), (e) => promise.reject(e)));
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
        promiseList.map((p) => promise.setPrecedingPromise(p));
        promiseList.forEach((p) => p.then((v) => promise.resolve(v), (e) => {
            rejects.push(e);
            if (rejects.length == promiseList.length) {
                promise.reject(new AggregateError(rejects));
            }
        }));
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
/* let f_promise_1 = new FlushablePromise<number>(() => 32); //flushing function is then ()=>

let f_promise_2 = f_promise_1.then((x) => x * 2);
let f_promise_3 = f_promise_2.then((x) => x + "px");
f_promise_1.then((x) => console.log("promise 1: " + x));
f_promise_2.then((x) => console.log("promise 2: " + x));
f_promise_3.then((x) => console.log("promise 3: " + x));
setTimeout(() => f_promise_1.resolve(16), 5000);
setTimeout(() => f_promise_3.flush(), 1000); */
//testing for all
let p1 = new FlushablePromise(() => 3);
let p2 = new FlushablePromise(() => "hei");
let p3 = new FlushablePromise(() => ["nei"]);
let p4 = FlushablePromise.all([p1, p2, p3]);
setTimeout(() => {
    p1.resolve(1);
    p2.resolve("h");
    p3.resolve(['h']);
}, 3000);
let p5 = p4.then((x) => { console.log("p4: " + x); return x; });
setTimeout(() => {
    p5.flush();
}, 1000);
//# sourceMappingURL=FlushablePromise_ts.js.map