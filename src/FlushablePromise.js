// @flow

export default class FlushablePromise<T,U=T> {
    _promise: Promise<T>;
    resolve: (T) => void;
    reject: (any) => void;
    _flush: ?[(() => U),FlushablePromise<any>]; //tuple of the flushing function and the promise to resolve it with
    isResolvedOrRejected: boolean;

   
    /**
     * onFlush parameter: only used for first promise of chain if one wants flushable option
     * fromFlushable parameter: only used for chained promises, tuple of flush-function and the first promise in the chain
     */
    constructor(onFlush?: (() => U), fromFlushable?: [(()=>U),FlushablePromise<U>]) {
        this._promise = new Promise((resolve, reject) => {
            this.resolve = (v) => {
              resolve(v);
              this.isResolvedOrRejected = true; //needed a way to check if a promise is settled
            };
            this.reject = (e) => {
              reject(e);
              this.isResolvedOrRejected = true;
            };
          });
      
        if (fromFlushable) {this._flush = fromFlushable} //will only happen if constructor is used from inside then
        else if (onFlush) {this._flush = [onFlush, this]}  //the first promise of the chain is created
        this.isResolvedOrRejected = false;

    }





    
    then<ResolveType=T,RejectType=empty>(onFulfilled: (T) => (ResolveType), onRejected?: (any) => (RejectType)): FlushablePromise<ResolveType | RejectType, U> {
        let newPromise = this._flush ? new FlushablePromise<ResolveType | RejectType,U>(undefined,[this._flush[0], this._flush[1]]) :  new FlushablePromise<ResolveType | RejectType,U>()

        this._promise.then( //calling the old (this promise) promises then 
            x => newPromise.resolve(onFulfilled(x)), //resolve the new promise with the result of the onfulfilled function
            y => onRejected ? newPromise.resolve(onRejected(y)) : newPromise.reject(y) //resolve the new promise 
        ); 
        
        return newPromise
      }

    /**
     * 
     * Returns a new Promise. 
     * This new promise is always pending when returned, 
     * regardless of the current promise's status. 
     * It's eventually rejected if onRejected throws an error (this is the reason for the ) or returns
     * a Promise which is itself rejected; otherwise, it's eventually fulfilled.
     */
    catch<RejectType>(onRejected: ((x: any) => RejectType)): FlushablePromise<T | RejectType,U> {
      return this.then(x=>x, onRejected)//returner bare seg selv om catch ikke

    }

    /**
     * check if _flush exists, then resolves original promise with the flush function
     */
    flush():void {
      if (this._flush && this._flush.length ==2) {
        let retrieveValueFunction = this._flush[0];
        let originalPromise = this._flush[1];
        originalPromise.resolve(retrieveValueFunction())
    }
    }
    
}





let f_promise_1 = new FlushablePromise<number>(()=>32);//flushing function is then ()=>32
let f_promise_2 = f_promise_1.then((x => x*2));
f_promise_1.then((x => console.log("promise 1: " + x)));
f_promise_2.then((x => console.log("promise 2: " + x)));
setTimeout(()=>f_promise_1.resolve(16), 3000);
setTimeout(()=>f_promise_2.flush(), 1000);
 


