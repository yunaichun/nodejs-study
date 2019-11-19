/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 * @private
 */
/* js 调试工具: 会添加统一前缀【https://www.npmjs.com/package/debug】*/
var debug = require('debug')('express:router:route');
/* 展平嵌套数组 【https://www.npmjs.com/package/array-flatten】 */
var flatten = require('array-flatten');
/* 可以获取到 http 所有的合理请求方法名 【https://www.npmjs.com/package/methods】 */
var methods = require('methods');
var Layer = require('./layer');

/**
 * Module variables.
 * @private
 */

var slice = Array.prototype.slice;
var toString = Object.prototype.toString;

/**
 * Module exports.
 * @public
 */
/* 导出模块 */
module.exports = Route;

/**
 * Initialize `Route` with the given `path`,
 *
 * @param {String} path
 * @public
 */
/* 构造函数 */
function Route(path) {
  this.path = path;
  this.stack = [];

  debug('new %o', path)

  // route handlers for various http methods
  this.methods = {};
}

/**
 * Determine if the route handles a given method.
 * @private
 */
/* 是否有 method 方法 */
Route.prototype._handles_method = function _handles_method(method) {
  if (this.methods._all) {
    return true;
  }

  var name = method.toLowerCase();

  /* methods 中没有 head 方法的话取 get */
  if (name === 'head' && !this.methods['head']) {
    name = 'get';
  }

  return Boolean(this.methods[name]);
};

/**
 * @return {Array} supported HTTP methods
 * @private
 */
/* 标准化 methods 方法名 */
Route.prototype._options = function _options() {
  var methods = Object.keys(this.methods);

  // append automatic head
  /* methods 里面有 get 但是没有 head 请求方法 */
  if (this.methods.get && !this.methods.head) {
    methods.push('head');
  }

  /* 里面的 methods 方法名全部改为大写 */
  for (var i = 0; i < methods.length; i++) {
    // make upper case
    methods[i] = methods[i].toUpperCase();
  }

  return methods;
};

/**
 * dispatch req, res into this route
 * @private
 */
/* 执行中间件 */
Route.prototype.dispatch = function dispatch(req, res, done) {
  var idx = 0;
  /* router/index.js 文件中：
    1、route.use 方法有这个
    2、this.stack.push(layer); 
  */
  var stack = this.stack;
  if (stack.length === 0) {
    return done();
  }

  var method = req.method.toLowerCase();
  if (method === 'head' && !this.methods['head']) {
    method = 'get';
  }

  /* 请求的 req 上的 route 属性挂载 Route 实例 */
  req.route = this;


  next();
  function next(err) {
    // signal to exit route
    if (err && err === 'route') {
      return done();
    }

    // signal to exit router
    if (err && err === 'router') {
      return done(err)
    }

    /* 不存在就结束 */
    var layer = stack[idx++];
    if (!layer) {
      return done(err);
    }

    if (layer.method && layer.method !== method) {
      return next(err);
    }

    /* 调用 layer 上的 handle_error 和 handle_request 方法 */
    if (err) {
      layer.handle_error(err, req, res, next);
    } else {
      layer.handle_request(req, res, next);
    }
  }
};

/**
 * Add a handler for all HTTP verbs to this route.
 *
 * Behaves just like middleware and can respond or call `next`
 * to continue processing.
 *
 * You can use multiple `.all` call to add multiple handlers.
 *   
 *   function check_something(req, res, next){
 *     next();
 *   };
 *
 *   function validate_user(req, res, next){
 *     next();
 *   };
 *
 *   route
 *   .all(validate_user)
 *   .all(check_something)
 *   .get(function(req, res, next){
 *     res.send('hello world');
 *   });
 *
 * @param {function} handler
 * @return {Route} for chaining
 * @api public
 */

Route.prototype.all = function all() {
  /* 展开数组参数 */
  var handles = flatten(slice.call(arguments));

  /* 遍历中间件 handles */
  for (var i = 0; i < handles.length; i++) {
    var handle = handles[i];

    /* 数组参数的每一项必须是函数 */
    if (typeof handle !== 'function') {
      var type = toString.call(handle);
      var msg = 'Route.all() requires a callback function but got a ' + type
      throw new TypeError(msg);
    }

    /* 实例化 layer */
    var layer = Layer('/', {}, handle);
    layer.method = undefined;

    this.methods._all = true;
    /* 将 layer 中间件存储起来 */
    this.stack.push(layer);
  }

  return this;
};

/* Route 上绑定 methods 所有方法 */
methods.forEach(function(method){
  Route.prototype[method] = function(){
    /* 数组展开后的所有的参数 */
    var handles = flatten(slice.call(arguments));

    for (var i = 0; i < handles.length; i++) {
      var handle = handles[i];

      /* 数组参数的每一项必须是函数 */
      if (typeof handle !== 'function') {
        var type = toString.call(handle);
        var msg = 'Route.' + method + '() requires a callback function but got a ' + type
        throw new Error(msg);
      }

      debug('%s %o', method, this.path)

      /* 实例化 layer */
      var layer = Layer('/', {}, handle);
      layer.method = method;

      this.methods[method] = true;
      /* 将 layer 中间件存储起来 */
      this.stack.push(layer);
    }

    return this;
  };
});
