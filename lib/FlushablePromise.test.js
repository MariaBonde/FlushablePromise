import FlushablePromise from "../lib/FlushablePromise";

let f_promise_1 = new FlushablePromise(() => 32); //flushing function is then ()=>32
let f_promise_2 = f_promise_1.then(x => x * 2);
let f_promise_3 = f_promise_2.then(x => x + 10);
setTimeout(() => f_promise_1.resolve(16), 5000);
setTimeout(() => f_promise_3.flush(), 1000);

test('promise 1 should be 32: ', () => {
    expect(f_promise_1._promise).resolves.toBe(32);
  });

test('promise 2 should be 64: ', () => {
    expect(f_promise_2._promise).resolves.toBe(64);
});

test('promise 3 should be 74: ', () => {
    expect(f_promise_3._promise).resolves.toBe(74);
})


let p_1 = new FlushablePromise();
let p_2 = new FlushablePromise();
let p_3 = new FlushablePromise();
let p_4 = FlushablePromise.all([p_1,p_2,p_3])
p_1.resolve("hei");
p_2.resolve("nei")
p_3.resolve(1)
test('promise 4 should be ["hei","nei",1]', () => {
    expect(p_4._promise).resolves.toMatchObject(["hei","nei",1]); //toBe does not work ideally with array
})


let fp_1 = new FlushablePromise(()=>"foo");
let fp_2 = new FlushablePromise(()=>"bar");
let fp_3 = new FlushablePromise(()=>100);
let fp_4 = FlushablePromise.all([fp_1,fp_2,fp_3])
setTimeout(() => {fp_1.resolve("bar"); fp_2.resolve("foo"); fp_3.resolve(50)}, 5000);
setTimeout(() => fp_4.flush(), 1000);

test('promise fp_4 should be ["foo","bar",100]', () => {
    expect(fp_4._promise).resolves.toMatchObject(["foo","bar",100]); //toBe does not work ideally with array
})

