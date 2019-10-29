
'use strict';

/**
 * Module dependencies.
 */
/* node 模块 【http://nodejs.cn/api/url.html】 */
const URL = require('url').URL;
const stringify = require('url').format;
/* node 模块 【http://nodejs.cn/api/net.html】 */
const net = require('net');
/* node 模块 【http://nodejs.cn/api/querystring.html】 */
const qs = require('querystring');
/* node 模块 【http://nodejs.cn/api/util.html】 */
const util = require('util');

/* request 请求类型 【https://www.npmjs.com/package/accepts】 */
const accepts = require('accepts');
/* 解析 content-type 【https://www.npmjs.com/package/content-type】*/
const contentType = require('content-type');
/* 解析 req.url 【https://www.npmjs.com/package/parseurl】 */
const parse = require('parseurl');
/* 判断请求类型 【https://www.npmjs.com/package/type-is】 */
const typeis = require('type-is');
/* HTTP响应新鲜度测试（etag、last-modified、if-none-match） 【https://www.npmjs.com/package/fresh】 */
const fresh = require('fresh');
/*白名单选择【https://www.npmjs.com/package/only】*/
const only = require('only');

const IP = Symbol('context#ip');

/**
 * Prototype.
 */

module.exports = {

  /**
   * Return request header.
   *
   * @return {Object}
   * @api public
   */
  get header() {
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
    /* 获取 req 上的 header */
    return this.req.headers;
  },

  /**
   * Set request header.
   *
   * @api public
   */
  set header(val) {
    /* 设置 req 上的 header */
    this.req.headers = val;
  },

  /**
   * Return request header, alias as request.header
   *
   * @return {Object}
   * @api public
   */

  get headers() {
    /* 获取 req 上的 headers */
    return this.req.headers;
  },

  /**
   * Set request header, alias as request.header
   *
   * @api public
   */

  set headers(val) {
    /* 设置 req 上的 headers */
    this.req.headers = val;
  },

  /**
   * Get request URL.
   *
   * @return {String}
   * @api public
   */
  get url() {
    /* 获取 req 上的 url */
    return this.req.url;
  },

  /**
   * Set request URL.
   *
   * @api public
   */
  set url(val) {
    /* 设置 req 上的 url  */
    this.req.url = val;
  },

  /**
   * Get origin of URL.
   *
   * @return {String}
   * @api public
   */
  get origin() {
    /* 获取 req 上的 origin */
    return `${this.protocol}://${this.host}`;
  },

  /**
   * Get full request URL.
   *
   * @return {String}
   * @api public
   */
  get href() {
    /* 获取 req 上的 href  */
    // support: `GET http://example.com/foo`
    /* originalUrl 含有协议 */
    if (/^https?:\/\//i.test(this.originalUrl)) return this.originalUrl;
     /* originalUrl 不含有协议 */
    return this.origin + this.originalUrl;
  },

  /**
   * Get request method.
   *
   * @return {String}
   * @api public
   */
  get method() {
    /* 获取挂载在 req 上的方法 method */
    return this.req.method;
  },

  /**
   * Set request method.
   *
   * @param {String} val
   * @api public
   */
  set method(val) {
    /* 设置挂载在 req 上的方法 method */
    this.req.method = val;
  },

  /**
   * Get request pathname.
   *
   * @return {String}
   * @api public
   */
  get path() {
    /* 获取请求路径 path ，实际是获取 req 的 pathname */
    return parse(this.req).pathname;
  },

  /**
   * Set pathname, retaining the query-string when present.
   *
   * @param {String} path
   * @api public
   */
  set path(path) {
    /* 设置请求路径 path ，实际是设置 req 上的 pathname 和 path */
    const url = parse(this.req);
    if (url.pathname === path) return;

    url.pathname = path;
    url.path = null;

    this.url = stringify(url);
  },

  /**
   * Get parsed query-string.
   *
   * @return {Object}
   * @api public
   */
  get query() {
    /* 获取 req 上的 query */
    const str = this.querystring;
    const c = this._querycache = this._querycache || {};
    return c[str] || (c[str] = qs.parse(str));
  },

  /**
   * Set query-string as an object.
   *
   * @param {Object} obj
   * @api public
   */
  set query(obj) {
    /* 设置 req 上的 query */
    this.querystring = qs.stringify(obj);
  },

  /**
   * Get query string.
   *
   * @return {String}
   * @api public
   */
  get querystring() {
    /* 获取 req 上的 querystring ，实际上是从 req 上的 query 截取 */
    if (!this.req) return '';
    return parse(this.req).query || '';
  },

  /**
   * Set querystring.
   *
   * @param {String} str
   * @api public
   */
  set querystring(str) {
    /* 设置 req 上的 querystring ，实际上是从 req 上个的 search 和 path 截取 */
    const url = parse(this.req);
    if (url.search === `?${str}`) return;

    url.search = str;
    url.path = null;

    this.url = stringify(url);
  },

  /**
   * Get the search string. Same as the querystring
   * except it includes the leading ?.
   *
   * @return {String}
   * @api public
   */
  get search() {
    /* 获取 req 上的 search，实际是从 req 上的 querystring 截取*/
    if (!this.querystring) return '';
    return `?${this.querystring}`;
  },

  /**
   * Set the search string. Same as
   * request.querystring= but included for ubiquity.
   *
   * @param {String} str
   * @api public
   */
  set search(str) {
    /* 设置 req 上的 search 实际是设置 querystring */
    this.querystring = str;
  },

  /**
   * Parse the "Host" header field host
   * and support X-Forwarded-Host when a
   * proxy is enabled.
   *
   * @return {String} hostname:port
   * @api public
   */
  get host() {
    /*分析，在 request.js 文件中 this.app 实际上是调用什么？
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
      this.app -> request.app -> 
      request: {
        app: this,
        req: req,
        res: res,
        __proto__: Object.create(this.request)
      }
    */
    /* 获取 req 上的 host */
    const proxy = this.app.proxy; // 默认为 false
    let host = proxy && this.get('X-Forwarded-Host');
    if (!host) {
      if (this.req.httpVersionMajor >= 2) host = this.get(':authority');
      if (!host) host = this.get('Host');
    }
    if (!host) return '';
    return host.split(/\s*,\s*/, 1)[0];
  },

  /**
   * Parse the "Host" header field hostname
   * and support X-Forwarded-Host when a
   * proxy is enabled.
   *
   * @return {String} hostname
   * @api public
   */
  get hostname() {
    /* 获取 req 对象上的 hostname，实际从 host 截取 */
    const host = this.host;
    if (!host) return '';
    if ('[' == host[0]) return this.URL.hostname || ''; // IPv6
    return host.split(':', 1)[0];
  },

  /**
   * Get WHATWG parsed URL.
   * Lazily memoized.
   *
   * @return {URL|Object}
   * @api public
   */
  get URL() {
    /* 获取 req 上的 URL */
    /* istanbul ignore else */
    if (!this.memoizedURL) {
      const originalUrl = this.originalUrl || ''; // avoid undefined in template string
      try {
        this.memoizedURL = new URL(`${this.origin}${originalUrl}`);
      } catch (err) {
        this.memoizedURL = Object.create(null);
      }
    }
    return this.memoizedURL;
  },

  /**
   * Check if the request is fresh, aka
   * Last-Modified and/or the ETag
   * still match.
   *
   * @return {Boolean}
   * @api public
   */
  get fresh() {
    /* 缓存相关 */
    const method = this.method;
    const s = this.ctx.status;

    // GET or HEAD for weak freshness validation only
    if ('GET' != method && 'HEAD' != method) return false;

    // 2xx or 304 as per rfc2616 14.26
    if ((s >= 200 && s < 300) || 304 == s) {
      /*分析，在 request.js 文件中 this.response 实际上是调用什么？
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
        this.response -> request.response -> response ->
        {
          app: this,
          req: req,
          res: res,
          __proto__: Object.create(this.response)
        }
      */
      /* fresh 对比请求头和响应头：
        var reqHeaders = { 'if-none-match': '"foo"' };
        var resHeaders = { 'etag': '"bar"' };
        fresh(reqHeaders, resHeaders);
        // => false
        
        var reqHeaders = { 'if-none-match': '"foo"' };
        var resHeaders = { 'etag': '"foo"' };
        fresh(reqHeaders, resHeaders);
        // => true
       */
      return fresh(this.header, this.response.header);
    }

    return false;
  },

  /**
   * Check if the request is stale, aka
   * "Last-Modified" and / or the "ETag" for the
   * resource has changed.
   *
   * @return {Boolean}
   * @api public
   */
  get stale() {
    /* 缓存分类
      强缓存：
      Expires：Thu，21 Jan 2017 23:39:02     GMT （绝对时间：服务端下发的时间，但是客户端可能不一致）  
      Cache-Controll：max-age=3600 （相对时间：以客户端为准，单位为秒；两个都下发的话，以此为标准）

      协商缓存：
      Last-Mofified：上次修改时间，服务器下发的
      If-Modified-Since：请求的时候客户端发送的，给服务端对比的（过了强缓存时间）
      Etag：hash值，虽然修改时间变了，但是内容没有变。完全可以从副本拿。服务器下发的
      If-None-Match：请求的时候客户端发送的，给服务端对比的（过了强缓存时间）
    */
    /* 是否过了协商缓存期 */
    return !this.fresh;
  },

  /**
   * Check if the request is idempotent.
   *
   * @return {Boolean}
   * @api public
   */
  get idempotent() {
    const methods = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE'];
    /* this.method 是以上其一 */
    return !!~methods.indexOf(this.method);
  },

  /**
   * Return the request socket.
   *
   * @return {Connection}
   * @api public
   */
  get socket() {
    /* 获取请求 socket 协议 */
    return this.req.socket;
  },

  /**
   * Get the charset when present or undefined.
   *
   * @return {String}
   * @api public
   */
  get charset() {
    /* 获取 req 上的 charset */
    try {
      const { parameters } = contentType.parse(this.req);
      return parameters.charset || '';
    } catch (e) {
      return '';
    }
  },

  /**
   * Return parsed Content-Length when present.
   *
   * @return {Number}
   * @api public
   */
  get length() {
    /* 获取 req 上的 Content-Length */ 
    const len = this.get('Content-Length');
    if (len == '') return;
    return ~~len;
  },

  /**
   * Return the protocol string "http" or "https"
   * when requested with TLS. When the proxy setting
   * is enabled the "X-Forwarded-Proto" header
   * field will be trusted. If you're running behind
   * a reverse proxy that supplies https for you this
   * may be enabled.
   *
   * @return {String}
   * @api public
   */
  get protocol() {
    /* 获取 req 上的 socket、X-Forwarded-Proto 等 */
    if (this.socket.encrypted) return 'https';
    if (!this.app.proxy) return 'http';
    const proto = this.get('X-Forwarded-Proto');
    return proto ? proto.split(/\s*,\s*/, 1)[0] : 'http';
  },

  /**
   * Short-hand for:
   *
   *    this.protocol == 'https'
   *
   * @return {Boolean}
   * @api public
   */
  get secure() {
    /* 协议是 https 才是安全的 */
    return 'https' == this.protocol;
  },

  /**
   * When `app.proxy` is `true`, parse
   * the "X-Forwarded-For" ip address list.
   *
   * For example if the value were "client, proxy1, proxy2"
   * you would receive the array `["client", "proxy1", "proxy2"]`
   * where "proxy2" is the furthest down-stream.
   *
   * @return {Array}
   * @api public
   */

  get ips() {
    /* 获取 req 上的 X-Forwarded-For */
    const proxy = this.app.proxy;
    const val = this.get('X-Forwarded-For');
    return proxy && val
      ? val.split(/\s*,\s*/)
      : [];
  },

  /**
   * Return request's remote address
   * When `app.proxy` is `true`, parse
   * the "X-Forwarded-For" ip address list and return the first one
   *
   * @return {String}
   * @api public
   */

  get ip() {
    /* 获取 ip，其中 const IP = Symbol('context#ip'); */
    if (!this[IP]) {
      this[IP] = this.ips[0] || this.socket.remoteAddress || '';
    }
    return this[IP];
  },

  set ip(_ip) {
    /* 设置 ip */
    this[IP] = _ip;
  },

  /**
   * Return subdomains as an array.
   *
   * Subdomains are the dot-separated parts of the host before the main domain
   * of the app. By default, the domain of the app is assumed to be the last two
   * parts of the host. This can be changed by setting `app.subdomainOffset`.
   *
   * For example, if the domain is "tobi.ferrets.example.com":
   * If `app.subdomainOffset` is not set, this.subdomains is
   * `["ferrets", "tobi"]`.
   * If `app.subdomainOffset` is 3, this.subdomains is `["tobi"]`.
   *
   * @return {Array}
   * @api public
   */
  get subdomains() {
    /* 默认获取 2 级子域 */
    /* subdomainOffset 默认为 2 */
    const offset = this.app.subdomainOffset;
    const hostname = this.hostname;
    if (net.isIP(hostname)) return [];
    return hostname
      .split('.') /* 以 . 分割 */
      .reverse() /* 反转数组 */
      .slice(offset); /* 从 offset 位置开始截取 */
    /* 综上所述：
      1、以点 . 分割 hostname
      2、分割后从右向左数，从 0 开始数
      3、offset 为几，就是前面的数组
    */
  },

  /**
   * Get accept object.
   * Lazily memoized.
   *
   * @return {Object}
   * @api private
   */
  get accept() {
    /* 获取 req 接收的类型 content-type
      var accept = accepts(req);
      switch (accept.type(['json', 'html'])) {
        case 'json':
      } 
    */
    return this._accept || (this._accept = accepts(this.req));
  },

  /**
   * Set accept object.
   *
   * @param {Object}
   * @api private
   */
  set accept(obj) {
    /* 设置 req 可以接收的 content-type  */
    this._accept = obj;
  },

  /**
   * Check if the given `type(s)` is acceptable, returning
   * the best match when true, otherwise `false`, in which
   * case you should respond with 406 "Not Acceptable".
   *
   * The `type` value may be a single mime type string
   * such as "application/json", the extension name
   * such as "json" or an array `["json", "html", "text/plain"]`. When a list
   * or array is given the _best_ match, if any is returned.
   *
   * Examples:
   *
   *     // Accept: text/html
   *     this.accepts('html');
   *     // => "html"
   *
   *     // Accept: text/*, application/json
   *     this.accepts('html');
   *     // => "html"
   *     this.accepts('text/html');
   *     // => "text/html"
   *     this.accepts('json', 'text');
   *     // => "json"
   *     this.accepts('application/json');
   *     // => "application/json"
   *
   *     // Accept: text/*, application/json
   *     this.accepts('image/png');
   *     this.accepts('png');
   *     // => false
   *
   *     // Accept: text/*;q=.5, application/json
   *     this.accepts(['html', 'json']);
   *     this.accepts('html', 'json');
   *     // => "json"
   *
   * @param {String|Array} type(s)...
   * @return {String|Array|false}
   * @api public
   */
  accepts(...args) {
    /* 获取 req 接收的类型 content-type
      var accept = accepts(req);
      switch (accept.type(['json', 'html'])) {
        case 'json':
      } 
    */
    return this.accept.types(...args);
  },

  /**
   * Return accepted encodings or best fit based on `encodings`.
   *
   * Given `Accept-Encoding: gzip, deflate`
   * an array sorted by quality is returned:
   *
   *     ['gzip', 'deflate']
   *
   * @param {String|Array} encoding(s)...
   * @return {String|Array}
   * @api public
   */
  acceptsEncodings(...args) {
    /* 获取 req 接收的压缩类型
      var accept = accepts(req);
      switch (accept.encodings(['gzip', 'deflate'])) {
        case 'json':
      } 
    */
    return this.accept.encodings(...args);
  },

  /**
   * Return accepted charsets or best fit based on `charsets`.
   *
   * Given `Accept-Charset: utf-8, iso-8859-1;q=0.2, utf-7;q=0.5`
   * an array sorted by quality is returned:
   *
   *     ['utf-8', 'utf-7', 'iso-8859-1']
   *
   * @param {String|Array} charset(s)...
   * @return {String|Array}
   * @api public
   */
  acceptsCharsets(...args) {
    /* 获取 req 接收的编码类型
      var accept = accepts(req);
      switch (accept.charsets(['utf-8', 'utf-7'])) {
        case 'json':
      } 
    */
    return this.accept.charsets(...args);
  },

  /**
   * Return accepted languages or best fit based on `langs`.
   *
   * Given `Accept-Language: en;q=0.8, es, pt`
   * an array sorted by quality is returned:
   *
   *     ['es', 'pt', 'en']
   *
   * @param {String|Array} lang(s)...
   * @return {Array|String}
   * @api public
   */
  acceptsLanguages(...args) {
    /* 获取 req 接收的语言
      var accept = accepts(req);
      switch (accept.languages(['es', 'en'])) {
        case 'json':
      } 
    */
    return this.accept.languages(...args);
  },

  /**
   * Check if the incoming request contains the "Content-Type"
   * header field, and it contains any of the give mime `type`s.
   * If there is no request body, `null` is returned.
   * If there is no content type, `false` is returned.
   * Otherwise, it returns the first `type` that matches.
   *
   * Examples:
   *
   *     // With Content-Type: text/html; charset=utf-8
   *     this.is('html'); // => 'html'
   *     this.is('text/html'); // => 'text/html'
   *     this.is('text/*', 'application/json'); // => 'text/html'
   *
   *     // When Content-Type is application/json
   *     this.is('json', 'urlencoded'); // => 'json'
   *     this.is('application/json'); // => 'application/json'
   *     this.is('html', 'application/*'); // => 'application/json'
   *
   *     this.is('html'); // => false
   *
   * @param {String|Array} types...
   * @return {String|false|null}
   * @api public
   */
  is(types) {
    /* 判断请求 req 是不是 types 类型 */
    if (!types) return typeis(this.req);
    if (!Array.isArray(types)) types = [].slice.call(arguments);
    return typeis(this.req, types);
  },

  /**
   * Return the request mime type void of
   * parameters such as "charset".
   *
   * @return {String}
   * @api public
   */
  get type() {
    /* 获取 req 的 Content-Type */ 
    const type = this.get('Content-Type');
    if (!type) return '';
    return type.split(';')[0];
  },

  /**
   * Return request header.
   *
   * The `Referrer` header field is special-cased,
   * both `Referrer` and `Referer` are interchangeable.
   *
   * Examples:
   *
   *     this.get('Content-Type');
   *     // => "text/plain"
   *
   *     this.get('content-type');
   *     // => "text/plain"
   *
   *     this.get('Something');
   *     // => ''
   *
   * @param {String} field
   * @return {String}
   * @api public
   */
  get(field) {
    /* 获取 req 上指定字段 field */
    const req = this.req;
    switch (field = field.toLowerCase()) {
      case 'referer':
      case 'referrer':
        return req.headers.referrer || req.headers.referer || '';
      default:
        return req.headers[field] || '';
    }
  },

  /**
   * Inspect implementation.
   *
   * @return {Object}
   * @api public
   */
  inspect() {
    /* 检查 */
    if (!this.req) return;
    return this.toJSON();
  },

  /**
   * Return JSON representation.
   *
   * @return {Object}
   * @api public
   */
  toJSON() {
    /* 只展示当前 reuest 上三个字段 method、url、header */
    return only(this, [
      'method',
      'url',
      'header'
    ]);
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
