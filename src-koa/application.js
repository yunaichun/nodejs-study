
'use strict';

/**
 * Module dependencies.
 */

/*正则判断当前传入的 function 是否是标准的 generator 函数【https://www.npmjs.com/package/is-generator-function】*/
const isGeneratorFunction = require('is-generator-function');
/*js 调试工具: 会添加统一前缀【https://www.npmjs.com/package/debug】*/
const debug = require('debug')('koa:application');
/*判断当前在运行 koa 的某些接口或者方法是否过期，如果过期，会给出一个升级的提示【https://www.npmjs.com/package/depd】*/
const deprecate = require('depd')('koa');
/*当 http 请求关闭，完成或者出错的时候调用注册好的回调【https://www.npmjs.com/package/on-finished】*/
const onFinished = require('on-finished');
/*请求状态码【https://www.npmjs.com/package/statuses】*/
const statuses = require('statuses');
/*白名单选择【https://www.npmjs.com/package/only】*/
const only = require('only');

/*兼容旧版本 koa 中间件：利用 co 库【https://github.com/koajs/convert】*/
const convert = require('koa-convert');
/*中间件的函数数组【https://github.com/koajs/compose】*/
const compose = require('koa-compose');
/*判断是否为 json 数据【https://www.npmjs.com/package/koa-is-json】*/
const isJSON = require('koa-is-json');

/*nodejs模块【http://nodejs.cn/api/events.html#events_events】*/
const Emitter = require('events');
// nodejs模块【http://nodejs.cn/api/util.html#util_util_inspect_custom】
const util = require('util');
/*nodejs模块【http://nodejs.cn/api/stream.html#stream_stream】*/
const Stream = require('stream');
/*nodejs模块【http://nodejs.cn/api/http.html#http_http】*/
const http = require('http');
/*运行服务上下文*/
const context = require('./context');
/*客户端的请求*/
const request = require('./request');
/*响应请求*/
const response = require('./response');



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
    /*context 模块，通过 context.js 创建
      1、this.context 为 context.js 创建的对象
      2、delegate(proto, 'response').getter('headerSent') 等价于
        this.context['origin'] = this.request['origin']
    */
    this.context = Object.create(context);
    /*request 模块，通过 request.js 创建*/
    this.request = Object.create(request);
    /*response 模块，通过 response.js 创建*/
    this.response = Object.create(response);
    // customInspect <boolean> 自定义的 inspect(depth, opts) 函数是否被调用。 默认为 true
    if (util.inspect.custom) {
      // util.inspect 用于对 object 做格式化字符串操作，并提供个性化配置项:
      // const util = require('util');
      // var child = {
      //   "name": "child",
      //   "age": 18,
      //   "friends": [
      //     {
      //       "name": "randal",
      //       "age" : 19,
      //       "friends": [
      //         {
      //           "name": "Kate",
      //           "age": 18
      //         }
      //       ]
      //     }
      //   ],
      //   "motto": "Now this is not the end. It is not even the beginning of the end. But it is, perhaps, the end of the beginning."
      // }
      // console.log(util.inspect(child, { compact: false, depth: null, breakLength: 80 }));
      this[util.inspect.custom] = this.inspect;
    }
  }

  /**
   * Inspect implementation.
   *
   * @return {Object}
   * @api public
   */
  inspect() {
    // 调用 toJSON 方法
    return this.toJSON();
  }

  /**
   * Return JSON representation.
   * We only bother showing settings.
   *
   * @return {Object}
   * @api public
   */
  toJSON() {
    // koa 应用以 JSON 格式输出时只会输出这个应用的 subdomainOffset ,  proxy 和 env 这三条信息。
    return only(this, [
      'subdomainOffset', // 存在 this 上的 key 值
      'proxy',
      'env'
    ]);
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
  listen(...args) {
    debug('listen');
    /*通过 createServer 创建服务*/
    const server = http.createServer(this.callback());
    return server.listen(...args);
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
  use(fn) {
    /*添加中间件, 中间件调用方法: 
      // 1、koa1
      app.use(function* (ctx, next) { 
        ctx.test = '123';
        yield next;
      });

      // 2、koa2
      app.use(async function(ctx, next) { 
        ctx.test = '123';
        next();
      });
    */
    /*1、use 必须使用函数*/
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
    /*2、如果 fn 是 Generator 函数，说明当前是 koa1 框架，将其转换为 koa2 函数*/
    if (isGeneratorFunction(fn)) {
      // 新版本不用 generator 函数，改为 async 函数了
      deprecate('Support for generators will be removed in v3. ' +
                'See the documentation for examples of how to convert old middleware ' +
                'https://github.com/koajs/koa/blob/master/docs/migration.md');
      /*兼容旧版本 koa 中间件：利用 co 库*/
      fn = convert(fn);
    }
    debug('use %s', fn._name || fn.name || '-');
    // 3、收集中间件
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
    /*1、compose 传入中间件数组， 返回一个函数。此函数返回 dispatch(0) ， 是一个 Promise 对象。*/
    const fn = compose(this.middleware);

    /* 2、监听错误 */
    if (!this.listenerCount('error')) this.on('error', this.onerror);

    const handleRequest = (req, res) => {
      /* 3、创建上下文 */
      const ctx = this.createContext(req, res);
      /* 4、每次请求发过来的时候，内部会执行 this.handleRequest */
      return this.handleRequest(ctx, fn);
    };

    /* 返回 handleRequest 给 http.createServer 作为参数。即返回： (req, res) => {} */
    return handleRequest;
  }

  /**
   * Initialize a new context.
   *
   * @api private
   */
  createContext(req, res) {
    /* 1、创建 request、response 对象，挂载到创建的 context 对象上
      context: {
        request: this.request, // Object.create(request)
        response: this.response, // Object.create(response)
        __proto__: Object.create(this.context) 
      } 
    */
    const context = Object.create(this.context);
    const request = context.request = Object.create(this.request);
    const response = context.response = Object.create(this.response);

    /* 2、将 req、res、this 挂载到 context、request、response对象上
      context: {
        app: this,
        req: req,
        res: res,
        __proto__: Object.create(this.context) 
      }
      request: {
        app: this,
        req: req,
        res: res,
        __proto__: Object.create(this.request)
      }
      response: {
        app: this,
        req: req,
        res: res,
        __proto__: Object.create(this.response)
      }
    */
    context.app = request.app = response.app = this;
    context.req = request.req = response.req = req;
    context.res = request.res = response.res = res;

    /* 3、将 context、response挂载到 request 对象上，以此类推
      request:{
        ctx: context,
        response: response
      }
      response: {
        ctx: context,
        request: request
      }
    */
    request.ctx = response.ctx = context;
    request.response = response;
    response.request = request;

    /* 4、将 req.url 挂载到 request 对象上的 originalUrl 属性上 */
    context.originalUrl = request.originalUrl = req.url;
    context.state = {};

    /*分析，在 request.js 文件中 this.req 实际上是调用什么？
      var request = {
        test: function() {
          console.log(this); // { __proto__: { test: function } } 即为 { __proto__: request }
        }
      };
      
      var App = function() {
        this.request = Object.create(request);
      };
      var app = new App();
      app.request.test(); 

      综上可知，在 request.js 文件中获取 this.req ，表明肯定走到 createContext 方法中了
      this.req -> request.req -> req
    */

  
    // 返回 context
    return context;
  }

  /**
   * Handle request in callback.
   *
   * @api private
   */
  handleRequest(ctx, fnMiddleware) {
    const res = ctx.res;
    res.statusCode = 404;
    /* 1、错误处理：onerror 函数 */
    const onerror = err => ctx.onerror(err);
    const handleResponse = () => respond(ctx);
    /* 2、onFinished 监听 response 执行完成，以用来做一些资源清理工作。 */
    onFinished(res, onerror);
    /* 3、执行传入的 fnMiddleware  ->  4、处理响应
      const fn = compose(this.middleware);
      this.handleRequest(ctx, fn); 
    */
    return fnMiddleware(ctx).then(handleResponse).catch(onerror);
  }

  /**
   * Default error handler.
   *
   * @param {Error} err
   * @api private
   */
  onerror(err) {
    /* 1、错误实例，抛出错误 */
    if (!(err instanceof Error)) throw new TypeError(util.format('non-error thrown: %j', err));
   
    /* 2、404 错误 */
    if (404 == err.status || err.expose) return;
    /* 3、不需要监控 HTTP 请求错误，则可以将 silentHttp 属性设为 true */
    if (this.silent) return;

    /* 4、打印错误 */
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

  /* HEAD 请求处理 */
  if ('HEAD' == ctx.method) {
    /* 没有发送响应头 */
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
    /* 没有发送响应头 */
    if (!res.headersSent) {
      ctx.type = 'text';
      ctx.length = Buffer.byteLength(body);
    }
    return res.end(body);
  }

  // responses
  if (Buffer.isBuffer(body)) return res.end(body); /* Buffer 请求体 */
  if ('string' == typeof body) return res.end(body); /* string 请求体 */
  if (body instanceof Stream) return body.pipe(res); /* Stream 请求体 */

  // body: json
  body = JSON.stringify(body);
  /* 没有发送响应头 */
  if (!res.headersSent) {
    ctx.length = Buffer.byteLength(body);
  }
  res.end(body);
}
