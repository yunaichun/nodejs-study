'use strict'

/**
 * Expose compositor.
 */

module.exports = compose

/**
 * Compose `middleware` returning
 * a fully valid middleware comprised
 * of all those which are passed.
 *
 * @param {Array} middleware
 * @return {Function}
 * @api public
 */

function compose (middleware) {
  /* 1、中间件必须是数组 */
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  /* 2、中间件手机的是回调函数 */
  for (const fn of middleware) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
  }

  /* compose 返回一个函数，此函数返回 dispatch(0) ， 是一个 Promise 对象 */
  return function (context, next) {
    // last called middleware #
    /* index：存储的是最新一次被执行的中间件  */
    let index = -1
    /* 以 0 为参数，执行了 dispatch 函数，代表从第一个中间件开始执行 */
    return dispatch(0)

    function dispatch (i) {
      /* i: “即将执行的中间件”索引, index: “上一次执行的中间件”的索引*/
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      /* index：存储的是最新一次被执行的中间件 */
      index = i

      /* 依次取中间件 */
      let fn = middleware[i]

      /* 将要执行的中间件索引已经超出了 middleware 边界，说明中间件已经全部执行完毕，开始准备执行之前传入的 next */
      if (i === middleware.length) fn = next
      
      /* 中间件已经执行完毕之后 fn 此时为 undefined ，直接返回一个已经 reolved 的 Promise 对象 */
      if (!fn) return Promise.resolve()
      
      try { 
        /* 对中间件的执行结果包裹一层 Promise.resolve */
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}


/* 参考地址：https://juejin.im/post/5c7decbbe51d454a7c5e8474
一、演示式例
const Koa = require('koa');
const app = new Koa();

const one = (ctx, next) => {
  console.log('1-Start');
  next();
  console.log('1-End');
}

const two = (ctx, next) => {
  console.log('2-Start');
  next();
  console.log('2-End');
}

const final = (ctx, next) => {
  console.log('final-Start');
  ctx.body = { text: 'Hello World' };
  next();
  console.log('final-End');
}

app.use(one);
app.use(two);
app.use(final);

app.listen(3004);



二、打印顺序
  1-Start
  2-Start
  final-Start
  final-End
  2-End
  1-End



三、等价于
const one = (ctx, next) => {
    console.log('1-Start');
    const two = async (ctx, next) => {
        console.log('2-Start');
        const final = async (ctx, next) => {
            console.log('final-Start');
            ctx.body = { text: 'Hello World' };
            next();
            console.log('final-End');
        }
        await final();
        console.log('2-End');
    }
    await two();
    console.log('1-End');
}
*/
