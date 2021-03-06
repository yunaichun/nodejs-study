
'use strict';

/**
 * Module dependencies.
 */
/* nodejs模块【http://nodejs.cn/api/util.html#util_util_inspect_custom】 */
const util = require('util');
/* node 请求异常处理模块【https://www.npmjs.com/package/http-errors】 */
const createError = require('http-errors');
/* 请求断言库【https://www.npmjs.com/package/http-assert】 */
const httpAssert = require('http-assert');
/* delegates 基本用法就是将内部对象的变量或者函数绑定在暴露在外层的变量上【https://blog.csdn.net/weixin_34258782/article/details/87961359】 */
const delegate = require('delegates');
/* 请求状态码【https://www.npmjs.com/package/statuses】*/
const statuses = require('statuses');
/* cookie 处理【https://www.npmjs.com/package/cookies】 */
const Cookies = require('cookies');

const COOKIES = Symbol('context#cookies');

/**
 * Context prototype.
 */
const proto = module.exports = {
  /**
   * util.inspect() implementation, which
   * just returns the JSON output.
   *
   * @return {Object}
   * @api public
   */
  inspect() {
    if (this === proto) return this;
    /* 转换成 JSON */
    return this.toJSON();
  },

  /**
   * Return JSON representation.
   *
   * Here we explicitly invoke .toJSON() on each
   * object, as iteration will otherwise fail due
   * to the getters and cause utilities such as
   * clone() to fail.
   *
   * @return {Object}
   * @api public
   */
  toJSON() {
    return {
      request: this.request.toJSON(),
      response: this.response.toJSON(),
      app: this.app.toJSON(),
      originalUrl: this.originalUrl,
      req: '<original node req>',
      res: '<original node res>',
      socket: '<original node socket>'
    };
  },

  /**
   * Similar to .throw(), adds assertion.
   *
   *    this.assert(this.user, 401, 'Please login!');
   *
   * See: https://github.com/jshttp/http-assert
   *
   * @param {Mixed} test
   * @param {Number} status
   * @param {String} message
   * @api public
   */
  assert: httpAssert,

  /**
   * Throw an error with `status` (default 500) and
   * `msg`. Note that these are user-level
   * errors, and the message may be exposed to the client.
   *
   *    this.throw(403)
   *    this.throw(400, 'name required')
   *    this.throw('something exploded')
   *    this.throw(new Error('invalid'))
   *    this.throw(400, new Error('invalid'))
   *
   * See: https://github.com/jshttp/http-errors
   *
   * Note: `status` should only be passed as the first parameter.
   *
   * @param {String|Number|Error} err, msg or status
   * @param {String|Number|Error} [err, msg or status]
   * @param {Object} [props]
   * @api public
   */

  throw(...args) {
    throw createError(...args);
  },

  /**
   * Default error handling.
   *
   * @param {Error} err
   * @api private
   */
  /* 回忆一下我们如何在koa中统一处理错误，只需要让koa实例监听onerror事件就可以了。
    则所有的中间件逻辑错误都会在这里被捕获并处理。如下所示：

    app.on('error', err => {
      log.error('server error', err)
    }); 
  */
  /* 此 onerror 真正的封装是在 application.js 文件中 handleRequest 中的封装 */
  onerror(err) {
    // don't do anything if there is no error.
    // this allows you to pass `this.onerror`
    // to node-style callbacks.
    if (null == err) return;

    if (!(err instanceof Error)) err = new Error(util.format('non-error thrown: %j', err));

    let headerSent = false;
    if (this.headerSent || !this.writable) {
      headerSent = err.headerSent = true;
    }

    // delegate
    /* 触发错误 
      var context = {
        test: function() {
          console.log(this); // { __proto__: { test: function } } 即为 { __proto__: request }
        }
      };
      
      var App = function() {
        this.request = Object.create(request);
      };
      var app = new App();
      app.request.test();

      综上可知，在 context.js 文件中获取 this.app ，表明肯定走到 createContext 方法中了
      this.app -> context.app -> 
      context: {
        app: this,
        req: req,
        res: res,
        __proto__: Object.create(this.context) 
      }
      -> 即为 application.js 中的 error
    */
    this.app.emit('error', err, this);

    // nothing we can do here other
    // than delegate to the app-level
    // handler and log.
    if (headerSent) {
      return;
    }

    const { res } = this;

    // first unset all headers
    /* istanbul ignore else */ 
    /* 一出所有的响应 headers */
    if (typeof res.getHeaderNames === 'function') {
      res.getHeaderNames().forEach(name => res.removeHeader(name));
    } else {
      res._headers = {}; // Node < 7.7
    }

    // then set those specified
    this.set(err.headers);

    // force text/plain
    this.type = 'text';

    // ENOENT support
    if ('ENOENT' == err.code) err.status = 404;

    // default to 500
    if ('number' != typeof err.status || !statuses[err.status]) err.status = 500;

    // respond
    const code = statuses[err.status];
    const msg = err.expose ? err.message : code;
    /* 需要设置状态和长度 */
    this.status = err.status;
    this.length = Buffer.byteLength(msg);
    res.end(msg);
  },

  get cookies() {
    /* 获取 cookies */
    if (!this[COOKIES]) {
      this[COOKIES] = new Cookies(this.req, this.res, {
        keys: this.app.keys,
        secure: this.request.secure
      });
    }
    return this[COOKIES];
  },

  set cookies(_cookies) {
    /* 设置 cookies */
    this[COOKIES] = _cookies;
  }
};

/**
 * Custom inspection implementation for newer Node.js versions.
 *
 * @return {Object}
 * @api public
 */
/* istanbul ignore else */
if (util.inspect.custom) {
  module.exports[util.inspect.custom] = module.exports.inspect;
}

/**
 * Response delegation.
 */
/* delegate 把 proto.response 下面的方法和属性都挂载到 proto 上 */
delegate(proto, 'response')
  .method('attachment')
  .method('redirect')
  .method('remove')
  .method('vary')
  .method('set')
  .method('append')
  .method('flushHeaders')
  .access('status')
  .access('message')
  .access('body')
  .access('length')
  .access('type')
  .access('lastModified')
  .access('etag')
  .getter('headerSent')
  .getter('writable');

/**
 * Request delegation.
 */
/* delegate 把 request 下面的方法和属性都挂载到 proto 上 */
delegate(proto, 'request')
  .method('acceptsLanguages')
  .method('acceptsEncodings')
  .method('acceptsCharsets')
  .method('accepts')
  .method('get')
  .method('is')
  .access('querystring')
  .access('idempotent')
  .access('socket')
  .access('search')
  .access('method')
  .access('query')
  .access('path')
  .access('url')
  .access('accept')
  .getter('origin')
  .getter('href')
  .getter('subdomains')
  .getter('protocol')
  .getter('host')
  .getter('hostname')
  .getter('URL')
  .getter('header')
  .getter('headers')
  .getter('secure')
  .getter('stale')
  .getter('fresh')
  .getter('ips')
  .getter('ip');
