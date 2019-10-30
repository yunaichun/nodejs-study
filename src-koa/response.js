
'use strict';

/**
 * Module dependencies.
 */
/*nodejs模块【http://nodejs.cn/api/path.html】*/
const extname = require('path').extname;
// nodejs模块【http://nodejs.cn/api/util.html#util_util_inspect_custom】
const util = require('util');
const isJSON = require('koa-is-json');

/*当 http 请求关闭，完成或者出错的时候调用注册好的回调【https://www.npmjs.com/package/on-finished】*/
const onFinish = require('on-finished');
/* 判断请求类型 【https://www.npmjs.com/package/type-is】 */
const typeis = require('type-is').is;
/*请求状态码【https://www.npmjs.com/package/statuses】*/
const statuses = require('statuses');
/*白名单选择【https://www.npmjs.com/package/only】*/
const only = require('only');

/* 解析响应 Content-Disposition【https://www.npmjs.com/package/content-disposition】 */
const contentDisposition = require('content-disposition');
/* 在流中注入错误 【https://www.npmjs.com/package/error-inject】 */
const ensureErrorHandler = require('error-inject');
/* 获取响应content-type【https://www.npmjs.com/package/cache-content-type】 */
const getType = require('cache-content-type');
/* http 特殊字符串编码 【https://www.npmjs.com/package/escape-html】 */
const escape = require('escape-html');
/* stream 流的销毁【https://www.npmjs.com/package/destroy】 */
const destroy = require('destroy');
/* 操作 http 响应头【https://www.npmjs.com/package/vary】 */
const vary = require('vary');
/* 编码 req.url 【https://www.npmjs.com/package/encodeurl】 */
const encodeUrl = require('encodeurl');
/* 断言库【https://www.npmjs.com/package/assert】 */
const assert = require('assert');

/**
 * Prototype.
 */

module.exports = {

  /**
   * Return the request socket.
   *
   * @return {Connection}
   * @api public
   */

  get socket() {
    /*分析，在 response.js 文件中 this.res 实际上是调用什么？
      var response = {
        test: function() {
          console.log(this); // { __proto__: { test: function } } 即为 { __proto__: request }
        }
      };
      
      var App = function() {
        this.response = Object.create(response);
      };
      var app = new App();
      app.response.test(); 

      综上可知，在 response.js 文件中获取 this.res ，表明肯定走到 createContext 方法中了
      this.res -> response.res -> res
    */
    /* 获取 res 上的 socket */
    return this.res.socket;
  },

  /**
   * Return response header.
   *
   * @return {Object}
   * @api public
   */

  get header() {
    /* 获取 res 上的 getHeaders、_headers */
    const { res } = this;
    return typeof res.getHeaders === 'function'
      ? res.getHeaders()
      : res._headers || {}; // Node < 7.7
  },

  /**
   * Return response header, alias as response.header
   *
   * @return {Object}
   * @api public
   */
  get headers() {
    /* 获取 res 上的 header */
    return this.header;
  },

  /**
   * Get response status code.
   *
   * @return {Number}
   * @api public
   */
  get status() {
    /* 获取 res 的 statusCode */
    return this.res.statusCode;
  },

  /**
   * Set response status code.
   *
   * @param {Number} code
   * @api public
   */
  set status(code) {
    /* 设置 res 的 statusCode */
    if (this.headerSent) return;

    assert(Number.isInteger(code), 'status code must be a number');
    assert(code >= 100 && code <= 999, `invalid status code: ${code}`);
    this._explicitStatus = true;
    this.res.statusCode = code;
    if (this.req.httpVersionMajor < 2) this.res.statusMessage = statuses[code];
    if (this.body && statuses.empty[code]) this.body = null;
  },

  /**
   * Get response status message
   *
   * @return {String}
   * @api public
   */
  get message() {
    /* 获取 res 的 statusMessage */
    return this.res.statusMessage || statuses[this.status];
  },

  /**
   * Set response status message
   *
   * @param {String} msg
   * @api public
   */
  set message(msg) {
    /* 设置 res 的 statusMessage */
    this.res.statusMessage = msg;
  },

  /**
   * Get response body.
   *
   * @return {Mixed}
   * @api public
   */
  get body() {
    /* 获取 res 的 _body */
    return this._body;
  },

  /**
   * Set response body.
   *
   * @param {String|Buffer|Object|Stream} val
   * @api public
   */

  set body(val) {
    /* 设置 res 的 _body */
    const original = this._body;
    this._body = val;

    // no content
    if (null == val) {
      if (!statuses.empty[this.status]) this.status = 204;
      this.remove('Content-Type');
      this.remove('Content-Length');
      this.remove('Transfer-Encoding');
      return;
    }

    // set the status
    if (!this._explicitStatus) this.status = 200;

    // set the content-type only if not yet set
    const setType = !this.header['content-type'];

    // string
    if ('string' == typeof val) {
      if (setType) this.type = /^\s*</.test(val) ? 'html' : 'text';
      this.length = Buffer.byteLength(val);
      return;
    }

    // buffer
    if (Buffer.isBuffer(val)) {
      if (setType) this.type = 'bin';
      this.length = val.length;
      return;
    }

    // stream
    if ('function' == typeof val.pipe) {
      onFinish(this.res, destroy.bind(null, val));
      ensureErrorHandler(val, err => this.ctx.onerror(err));

      // overwriting
      if (null != original && original != val) this.remove('Content-Length');

      if (setType) this.type = 'bin';
      return;
    }

    // json
    this.remove('Content-Length');
    this.type = 'json';
  },

  /**
   * Set Content-Length field to `n`.
   *
   * @param {Number} n
   * @api public
   */
  set length(n) {
    /* 设置 res 的 Content-Length */
    this.set('Content-Length', n);
  },

  /**
   * Return parsed response Content-Length when present.
   *
   * @return {Number}
   * @api public
   */
  get length() {
    /* 获取 res 的 content-length */
    const len = this.header['content-length'];
    const body = this.body;

    if (null == len) {
      if (!body) return;
      if ('string' == typeof body) return Buffer.byteLength(body);
      if (Buffer.isBuffer(body)) return body.length;
      if (isJSON(body)) return Buffer.byteLength(JSON.stringify(body));
      return;
    }
    /* 将小数部分去掉 */
    return Math.trunc(len) || 0;
  },

  /**
   * Check if a header has been written to the socket.
   *
   * @return {Boolean}
   * @api public
   */
  get headerSent() {
    /* 获取 res 的 headersSent */
    return this.res.headersSent;
  },

  /**
   * Vary on `field`.
   *
   * @param {String} field
   * @api public
   */
  vary(field) {
    /* res 响应头添加指定 field
      // about to user-agent sniff
      vary(res, 'User-Agent')
      var ua = req.headers['user-agent'] || ''
     */
    if (this.headerSent) return;

    vary(this.res, field);
  },

  /**
   * Perform a 302 redirect to `url`.
   *
   * The string "back" is special-cased
   * to provide Referrer support, when Referrer
   * is not present `alt` or "/" is used.
   *
   * Examples:
   *
   *    this.redirect('back');
   *    this.redirect('back', '/index.html');
   *    this.redirect('/login');
   *    this.redirect('http://google.com');
   *
   * @param {String} url
   * @param {String} [alt]
   * @api public
   */
  redirect(url, alt) {
    /*分析，在 response.js 文件中 this.res 实际上是调用什么？
      var ctx = {
        test: function() {
          console.log(this); // { __proto__: { test: function } } 即为 { __proto__: request }
        }
      };
      
      var App = function() {
        this.ctx = Object.create(ctx);
      };
      var app = new App();
      app.ctx.test(); 

      综上可知，在 response.js 文件中获取 this.ctx ，表明肯定走到 createContext 方法中了
      this.ctx -> response.ctx -> context
      context: {
        request: this.request, // Object.create(request)
        response: this.response, // Object.create(response)
        __proto__: Object.create(this.context) 
      }

      实际是调用 context.js 文件中的 get 方法 -> request.js 文件中的 get 方法
    */
    /* 获取 req 上的 header */
    // location
    if ('back' == url) url = this.ctx.get('Referrer') || alt || '/';
    this.set('Location', encodeUrl(url));

    // status
    if (!statuses.redirect[this.status]) this.status = 302;

    // html
    if (this.ctx.accepts('html')) {
      url = escape(url);
      this.type = 'text/html; charset=utf-8';
      this.body = `Redirecting to <a href="${url}">${url}</a>.`;
      return;
    }

    // text
    this.type = 'text/plain; charset=utf-8';
    this.body = `Redirecting to ${url}.`;
  },

  /**
   * Set Content-Disposition header to "attachment" with optional `filename`.
   *
   * @param {String} filename
   * @api public
   */
  attachment(filename, options) {
    /* 设置 res 的 Content-Disposition */
    if (filename) this.type = extname(filename);
    this.set('Content-Disposition', contentDisposition(filename, options));
  },

  /**
   * Set Content-Type response header with `type` through `mime.lookup()`
   * when it does not contain a charset.
   *
   * Examples:
   *
   *     this.type = '.html';
   *     this.type = 'html';
   *     this.type = 'json';
   *     this.type = 'application/json';
   *     this.type = 'png';
   *
   * @param {String} type
   * @api public
   */
  set type(type) {
    /* 设置或移除 res 的 Content-Type */
    type = getType(type);
    if (type) {
      this.set('Content-Type', type);
    } else {
      this.remove('Content-Type');
    }
  },

  /**
   * Set the Last-Modified date using a string or a Date.
   *
   *     this.response.lastModified = new Date();
   *     this.response.lastModified = '2013-09-13';
   *
   * @param {String|Date} type
   * @api public
   */
  set lastModified(val) {
    /* 设置 res 的 Last-Modified */ 
    if ('string' == typeof val) val = new Date(val);
    this.set('Last-Modified', val.toUTCString());
  },

  /**
   * Get the Last-Modified date in Date form, if it exists.
   *
   * @return {Date}
   * @api public
   */
  get lastModified() {
    /* 获取 res 的 Last-Modified */ 
    const date = this.get('last-modified');
    if (date) return new Date(date);
  },

  /**
   * Set the ETag of a response.
   * This will normalize the quotes if necessary.
   *
   *     this.response.etag = 'md5hashsum';
   *     this.response.etag = '"md5hashsum"';
   *     this.response.etag = 'W/"123456789"';
   *
   * @param {String} etag
   * @api public
   */
  set etag(val) {
    /* 设置 res 的 ETag */ 
    if (!/^(W\/)?"/.test(val)) val = `"${val}"`;
    this.set('ETag', val);
  },

  /**
   * Get the ETag of a response.
   *
   * @return {String}
   * @api public
   */
  get etag() {
    /* 获取 res 的 ETag */
    return this.get('ETag');
  },

  /**
   * Return the response mime type void of
   * parameters such as "charset".
   *
   * @return {String}
   * @api public
   */
  get type() {
    /* 获取 res 的 Content-Type */
    const type = this.get('Content-Type');
    if (!type) return '';
    return type.split(';', 1)[0];
  },

  /**
   * Check whether the response is one of the listed types.
   * Pretty much the same as `this.request.is()`.
   *
   * @param {String|Array} types...
   * @return {String|false}
   * @api public
   */
  is(types) {
    /* 判断 res 响应头是否是某种类型 */
    const type = this.type;
    if (!types) return type || false;
    if (!Array.isArray(types)) types = [].slice.call(arguments);
    return typeis(type, types);
  },

  /**
   * Return response header.
   *
   * Examples:
   *
   *     this.get('Content-Type');
   *     // => "text/plain"
   *
   *     this.get('content-type');
   *     // => "text/plain"
   *
   * @param {String} field
   * @return {String}
   * @api public
   */
  get(field) {
    /* 获取 res 的 header 中指定字段 */
    return this.header[field.toLowerCase()] || '';
  },

  /**
   * Set header `field` to `val`, or pass
   * an object of header fields.
   *
   * Examples:
   *
   *    this.set('Foo', ['bar', 'baz']);
   *    this.set('Accept', 'application/json');
   *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
   *
   * @param {String|Object|Array} field
   * @param {String} val
   * @api public
   */
  set(field, val) {
    /* 设置 res 响应头 */
    if (this.headerSent) return;

    if (2 == arguments.length) {
      /* 可以是数组和字符串 */
      if (Array.isArray(val)) val = val.map(v => typeof v === 'string' ? v : String(v));
      else if (typeof val !== 'string') val = String(val);
      this.res.setHeader(field, val);
    } else {
      /* 可以是对象 */
      for (const key in field) {
        this.set(key, field[key]);
      }
    }
  },

  /**
   * Append additional header `field` with value `val`.
   *
   * Examples:
   *
   * ```
   * this.append('Link', ['<http://localhost/>', '<http://localhost:3000/>']);
   * this.append('Set-Cookie', 'foo=bar; Path=/; HttpOnly');
   * this.append('Warning', '199 Miscellaneous warning');
   * ```
   *
   * @param {String} field
   * @param {String|Array} val
   * @api public
   */
  append(field, val) {
    /* 在 res 的 field 后面追加 val */
    const prev = this.get(field);

    if (prev) {
      val = Array.isArray(prev)
        ? prev.concat(val)
        : [prev].concat(val);
    }

    return this.set(field, val);
  },

  /**
   * Remove header `field`.
   *
   * @param {String} name
   * @api public
   */
  remove(field) {
    /* 移除 res 的 header */
    if (this.headerSent) return;

    this.res.removeHeader(field);
  },

  /**
   * Checks if the request is writable.
   * Tests for the existence of the socket
   * as node sometimes does not set it.
   *
   * @return {Boolean}
   * @api private
   */
  get writable() {
    /* 获取 res 的 socket 的 writable 属性 */
    // can't write any more after response finished
    if (this.res.finished) return false;

    const socket = this.res.socket;
    // There are already pending outgoing res, but still writable
    // https://github.com/nodejs/node/blob/v4.4.7/lib/_http_server.js#L486
    if (!socket) return true;
    return socket.writable;
  },

  /**
   * Inspect implementation.
   *
   * @return {Object}
   * @api public
   */
  inspect() {
    /* 将 res 的 body JSON 输出 */
    if (!this.res) return;
    const o = this.toJSON();
    o.body = this.body;
    return o;
  },

  /**
   * Return JSON representation.
   *
   * @return {Object}
   * @api public
   */
  toJSON() {
    /* 只输出 status、message、header */
    return only(this, [
      'status',
      'message',
      'header'
    ]);
  },

  /**
   * Flush any set headers, and begin the body
   */
  flushHeaders() {
    /* res 的 flushHeaders */
    this.res.flushHeaders();
  }
};

/**
 * Custom inspection implementation for newer Node.js versions.
 *
 * @return {Object}
 * @api public
 */
if (util.inspect.custom) {
  module.exports[util.inspect.custom] = module.exports.inspect;
}
