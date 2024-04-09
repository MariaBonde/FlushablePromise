# FlushablePromise

To run this project, you'll need `npm` or `yarn`. 

To set up Flow, first install `@babel/core`, `@babel/cli`, and `@babel/preset-flow` run
```console
npm install --save-dev @babel/core @babel/cli @babel/preset-flow
```

then run
```console
npm install --save-dev flow-bin
```
First time running the project, run
```console
npm run flow init
```


To test the code in [src/FlushablePromise.js](https://github.com/MariaBonde/FlushablePromise/blob/main/flowAttempt/src/FlushablePromise.js), you run these commands to first translate the Flow code into regular JavaScript, then you run the JavaScript file.

```console
./node_modules/.bin/babel src/ -d lib/  
```

```console
node lib/FlushablePromise.js  
```
