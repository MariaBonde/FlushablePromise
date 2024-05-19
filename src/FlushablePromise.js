// @flow

export default class FlushablePromise<T> {
  _promise: Promise<T>;
  resolve: (T) => void;
  reject: (any) => void;
  _fetchValue: (() => T); //tuple of the flushing function and the promise to resolve it with

 
  /**
   * onFlush parameter: only used for first promise of chain if one wants flushable option
   * fromFlushable parameter: only used for chained promises, tuple of flush-function and the first promise in the chain
   */
  constructor(onFlush?: (() => T)) {
    let { promise, resolve, reject } = Promise.withResolvers();
    [this._promise, this.resolve, this.reject] = [promise,resolve,reject];
    
      if (onFlush) {this._fetchValue = onFlush} 

  }
  
  then<ResolveType=T,RejectType=empty>(onFulfilled: (T) => (ResolveType), onRejected?: (any) => (RejectType)): FlushablePromise<ResolveType | RejectType> {
      let newPromise = new FlushablePromise<ResolveType | RejectType>();
      newPromise._setSourcePromise(this)

      this._promise.then( //calling the old (this promise) promises then 
      x => {//side 88
        let fulfilledVal = onFulfilled(x);
        if (fulfilledVal instanceof FlushablePromise) {
          fulfilledVal._setSourcePromise(this)
          newPromise._setSourcePromise(fulfilledVal)
          fulfilledVal.resolve(x)
          return newPromise.resolve(fulfilledVal)
        }
        else {
          return newPromise.resolve(fulfilledVal)
        }
      }, //resolve the new promise with the result of the onfulfilled function
        y => {
          if (onRejected) {
            let rejectedVal = onRejected(y)
            if (rejectedVal instanceof FlushablePromise) {
              rejectedVal._setSourcePromise(this)
              newPromise._setSourcePromise(rejectedVal)
              rejectedVal.reject(y)//????
              return newPromise.resolve(rejectedVal)
            }
            else {return newPromise.resolve(rejectedVal)}
          }
          else {return newPromise.reject(y)}
        }   //resolve the new promise 
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
  catch<RejectType>(onRejected: ((x: any) => RejectType)): FlushablePromise<T | RejectType> {
    return this.then(x=>x, onRejected)//returner bare seg selv om catch ikke

  }

  finally(onFinally: ()=>void | any): FlushablePromise<any>{
    if (typeof onFinally != 'function') {
      return this.then(onFinally,onFinally)
    }
    else {
      return this.then(
        (value) => FlushablePromise.resolve(onFinally()).then(()=>value),
        (reason) =>
          FlushablePromise.resolve(onFinally()).then(()=> {
            throw reason;
          })
      )
    }
  }

  /**
   * check if _flush exists, then resolves original promise with the flush function
   */
  flush():void {
    if (this._fetchValue) {
      this.resolve(this._fetchValue())
    }
    else if (this._sourcePromise) {
      this._sourcePromise.forEach((flushable)=>flushable.flush());
    }
  }

  _setSourcePromise(sourcePromise:FlushablePromise<any>):void {
    this._sourcePromise = [sourcePromise]
}

 _setSourcePromises(sourcePromise:FlushablePromise<any>[]):void {
  if (!this._sourcePromise) {
    this._sourcePromise = sourcePromise
  }
  else {
    this._sourcePromise = this._sourcePromise.concat(sourcePromise);
  }
}

static all(promiseList:FlushablePromise<any>[]): FlushablePromise<any[]> {
  let counter:number = promiseList.length;
  let arr = [];
  let promise = new FlushablePromise<any[]>;
  promise._setSourcePromises(promiseList) //every promise or just the flushable/the ones that have source promises?
  for (let i = 0; i < counter; i++) {
    promiseList[i].then((v) => {
      arr[i] = v;
      if(--counter == 0) {
        promise.resolve(arr)
      }
    },(a)=>promise.reject(a))
  }
  return promise
}


static race(promiseList: FlushablePromise<any>[]): FlushablePromise<any> {
  let promise = new FlushablePromise<any>
  promise._setSourcePromises(promiseList)
  promiseList.forEach((p)=>p.then((v)=>promise.resolve(v),(e)=>promise.reject(e)))
  return promise
}

static any(promiseList: FlushablePromise<any>[]): FlushablePromise<any> {
  let promise = new FlushablePromise<any>
  let rejects = []
  promise._setSourcePromises(promiseList)
  promiseList.forEach((p) => p.then(
      (v)=>promise.resolve(v),
      (e)=>{
        rejects.push(e)
        if (rejects.length == promiseList.length) {
          promise.reject(new AggregateError(rejects))
        }
      }))
  
  return promise
}

static resolve(value:any): FlushablePromise<any> {
  if (value instanceof FlushablePromise) {
    return value
  }
  let promise = new FlushablePromise<any>;
  promise.resolve(value);
  return promise

}

static reject(value:any): FlushablePromise<any> {
  let promise = new FlushablePromise<any>;
  promise.reject(value)
  return promise
}
  
}

let f_promise_1 = new FlushablePromise<number>(()=>32);//flushing function is then ()=>32
let f_promise_2 = f_promise_1.then((x => x*2));
f_promise_1.then((x => console.log("promise 1: " + x)));
f_promise_2.then((x => console.log("promise 2: " + x)));
setTimeout(()=>f_promise_1.resolve(16), 3000);
setTimeout(()=>f_promise_2.flush(), 1000);
 


