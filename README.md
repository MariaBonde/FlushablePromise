# FlushablePromise

This project contains two versions of the `FlushablePromise` class, one written in TypeScript, and one written in Flow. Both versions are in the [src](https://github.com/MariaBonde/FlushablePromise/tree/main/src) folder, while the JavaScript versions of the files are in the [lib](https://github.com/MariaBonde/FlushablePromise/tree/main/lib) folder. In addition to this, there are Jest tests in the [test](https://github.com/MariaBonde/FlushablePromise/tree/main/test) folder.

To run this project, you'll need `npm` or `yarn`. 
 
Before running any code, install the dependencies using 
```console
npm install
```

To test the code in [src/FlushablePromise.js](https://github.com/MariaBonde/FlushablePromise/blob/main/flowAttempt/src/FlushablePromise.js), you run these commands to first translate the Flow code into regular JavaScript, then you run the JavaScript file.

```console
npm run build 
```

```console
node lib/FlushablePromise.js  
```

And similarly for [src/FlushablePromise_ts.ts](https://github.com/MariaBonde/FlushablePromise/blob/main/src/FlushablePromise_ts.ts), run

```console
npm run build_ts
```

## Unit Testing
We have chosen `jest` as the unit testing framework to test the outcomes of the methods of the `FlushablePromise` class.

To run the tests, simply run
```console
npm test
```