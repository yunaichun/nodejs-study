
'use strict';

/**
 * Module dependencies.
 */

/*判断当前传入的 function 是否是标准的generator function
  主要是正则判断：var isFnRegex = /^\s*(?:function)?\*/ 
  /*
*/
const isGeneratorFunction = require('is-generator-function');
/*js 调试工具*/
const debug = require('debug')('koa:application');
/*事件监听，当 http 请求关闭，完成或者出错的时候调用注册好的回调*/
const onFinished = require('on-finished');
/*响应请求*/
const response = require('./response');
/*中间件的函数数组*/
const compose = require('koa-compose');
/*判断是否为 json 数据*/
const isJSON = require('koa-is-json');
/*运行服务上下文*/
const context = require('./context');
/*客户端的请求*/
const request = require('./request');
/*请求状态码*/
const statuses = require('statuses');
/*事件循环*/
const Emitter = require('events');
const util = require('util');
/*流处理*/
const Stream = require('stream');
/*http 请求*/
const http = require('http');
/*白名单选择*/
const only = require('only');

/*兼容旧版本 koa 中间件(利用 co 库)
  function convert (mw) {
    // 参数必须是函数
    if (typeof mw !== 'function') {
      throw new TypeError('middleware must be a function')
    }
    // 参数不是 Generator 函数，直接返回
    if (mw.constructor.name !== 'GeneratorFunction') {
      // assume it's Promise-based middleware
      return mw
    }
    // 参数是 Generator 函数
    const converted = function (ctx, next) {
      return co.call(ctx, mw.call(ctx, createGenerator(next)))
    }
    converted._name = mw._name || mw.name
    return converted
  }

  function * createGenerator (next) {
    return yield next()
  }

  // co 库的原理是传入 Generator 函数，可以自动执行，返回 Promise 函数
*/
const convert = require('koa-convert');
/*判断当前在运行 koa 的某些接口或者方法是否过期，如果过期，会给出一个升级的提示*/
const deprecate = require('depd')('koa');

/**
 * Expose `Application` class.
 * Inherits from `Emitter.prototype`.
 */
/*继承了 Emitter : 这个类可以直接为自定义事件注册回调函数和触发事件，同时可以捕捉到其他地方触发的事件*/
module.exports = class Application extends Emitter {
  /**
   * Initialize a new `Application`.
   *
   * @api public
   */

  /**
    *
    * @param {object} [options] Application options
    * @param {string} [options.env='development'] Environment
    * @param {string[]} [options.keys] Signed cookie keys
    * @param {boolean} [options.proxy] Trust proxy headers
    * @param {number} [options.subdomainOffset] Subdomain offset
    *
    */

  constructor(options) {
    super();
    options = options || {};
    /*是否信任 proxy header 参数，默认为 false*/
    this.proxy = options.proxy || false;
    /*子域默认偏移量，默认为 2*/
    this.subdomainOffset = options.subdomainOffset || 2;
    /*环境参数，默认为 NODE_ENV 或 'development'*/
    this.env = options.env || process.env.NODE_ENV || 'development';
    if (options.keys) this.keys = options.keys;
    /*保存通过 app.use(middleware) 注册的中间件*/
    this.middleware = [];
    /*context 模块，通过 context.js 创建*/
    this.context = Object.create(context);
    /*request 模块，通过 request.js 创建*/
    this.request = Object.create(request);
    /*response 模块，通过 response.js 创建*/
    this.response = Object.create(response);
    if (util.inspect.custom) {
      this[util.inspect.custom] = this.inspect;
    }
  }

  /**
   * Shorthand for:
   *
   *    http.createServer(app.callback()).listen(...)
   *
   * @param {Mixed} ...
   * @return {Server}
   * @api public
   */
  /*createServer 创建服务*/
  listen(...args) {
    debug('listen');
    const server = http.createServer(this.callback());
    return server.listen(...args);
  }

  /**
   * Return JSON representation.
   * We only bother showing settings.
   *
   * @return {Object}
   * @api public
   */

  toJSON() {
    return only(this, [
      'subdomainOffset',
      'proxy',
      'env'
    ]);
  }

  /**
   * Inspect implementation.
   *
   * @return {Object}
   * @api public
   */

  inspect() {
    return this.toJSON();
  }

  /**
   * Use the given middleware `fn`.
   *
   * Old-style middleware will be converted.
   *
   * @param {Function} fn
   * @return {Application} self
   * @api public
   */
  /*添加中间件, 中间件调用方法: 
    // koa2
    app.use(async function(ctx, next) { 
      ctx.test = '123';
      next();
    });
    // koa1
    app.use(function* (ctx, next) { 
      ctx.test = '123';
      yield next;
    });
  */
  use(fn) {
    /*use 必须使用函数*/
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
    /*如果 fn 是 Generator 函数，说明当前是 koa1 框架，将其转换为 koa2 函数*/
    if (isGeneratorFunction(fn)) {
      deprecate('Support for generators will be removed in v3. ' +
                'See the documentation for examples of how to convert old middleware ' +
                'https://github.com/koajs/koa/blob/master/docs/migration.md');
      /*兼容旧版本 koa 中间件(利用 co 库)
        function convert (mw) {
          // 参数必须是函数
          if (typeof mw !== 'function') {
            throw new TypeError('middleware must be a function')
          }
          // 参数不是 Generator 函数，直接返回
          if (mw.constructor.name !== 'GeneratorFunction') {
            // assume it's Promise-based middleware
            return mw
          }
          // 参数是 Generator 函数
          const converted = function (,ctx next) {
            return co.call(ctx, mw.call(ctx, createGenerator(next)))
          }
          converted._name = mw._name || mw.name
          return converted
        }

        function * createGenerator (next) {
          return yield next()
        }

        // co 库的原理是传入 Generator 函数，可以自动执行，返回 Promise 函数
      */
      // 此 Generator 经过 co 库包装了一层
      fn = convert(fn);
    }
    debug('use %s', fn._name || fn.name || '-');
    this.middleware.push(fn);
    return this;
  }

  /**
   * Return a request handler callback
   * for node's native http server.
   *
   * @return {Function}
   * @api public
   */

  callback() {
    const fn = compose(this.middleware);

    if (!this.listenerCount('error')) this.on('error', this.onerror);

    const handleRequest = (req, res) => {
      const ctx = this.createContext(req, res);
      return this.handleRequest(ctx, fn);
    };

    return handleRequest;
  }

  /**
   * Handle request in callback.
   *
   * @api private
   */

  handleRequest(ctx, fnMiddleware) {
    const res = ctx.res;
    res.statusCode = 404;
    const onerror = err => ctx.onerror(err);
    const handleResponse = () => respond(ctx);
    onFinished(res, onerror);
    return fnMiddleware(ctx).then(handleResponse).catch(onerror);
  }

  /**
   * Initialize a new context.
   *
   * @api private
   */

  createContext(req, res) {
    const context = Object.create(this.context);
    const request = context.request = Object.create(this.request);
    const response = context.response = Object.create(this.response);
    context.app = request.app = response.app = this;
    context.req = request.req = response.req = req;
    context.res = request.res = response.res = res;
    request.ctx = response.ctx = context;
    request.response = response;
    response.request = request;
    context.originalUrl = request.originalUrl = req.url;
    context.state = {};
    return context;
  }

  /**
   * Default error handler.
   *
   * @param {Error} err
   * @api private
   */

  onerror(err) {
    if (!(err instanceof Error)) throw new TypeError(util.format('non-error thrown: %j', err));

    if (404 == err.status || err.expose) return;
    if (this.silent) return;

    const msg = err.stack || err.toString();
    console.error();
    console.error(msg.replace(/^/gm, '  '));
    console.error();
  }
};

/**
 * Response helper.
 */

function respond(ctx) {
  // allow bypassing koa
  if (false === ctx.respond) return;

  if (!ctx.writable) return;

  const res = ctx.res;
  let body = ctx.body;
  const code = ctx.status;

  // ignore body
  if (statuses.empty[code]) {
    // strip headers
    ctx.body = null;
    return res.end();
  }

  if ('HEAD' == ctx.method) {
    if (!res.headersSent && isJSON(body)) {
      ctx.length = Buffer.byteLength(JSON.stringify(body));
    }
    return res.end();
  }

  // status body
  if (null == body) {
    if (ctx.req.httpVersionMajor >= 2) {
      body = String(code);
    } else {
      body = ctx.message || String(code);
    }
    if (!res.headersSent) {
      ctx.type = 'text';
      ctx.length = Buffer.byteLength(body);
    }
    return res.end(body);
  }

  // responses
  if (Buffer.isBuffer(body)) return res.end(body);
  if ('string' == typeof body) return res.end(body);
  if (body instanceof Stream) return body.pipe(res);

  // body: json
  body = JSON.stringify(body);
  if (!res.headersSent) {
    ctx.length = Buffer.byteLength(body);
  }
  res.end(body);
}
