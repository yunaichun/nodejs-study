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
 */
/* 解析JSON、Raw、文本、URL-encoded格式的请求体 【https://www.npmjs.com/package/body-parser】 */
var bodyParser = require('body-parser')
/* nodejs 官网 【http://nodejs.cn/api/events.html】 */
var EventEmitter = require('events').EventEmitter;
/* 合并对象 【https://www.npmjs.com/package/merge-descriptors】 */
var mixin = require('merge-descriptors');
/* 应用主体 */
var proto = require('./application');
/* 请求和响应 */
var req = require('./request');
var res = require('./response');
/* 路由 */
var Route = require('./router/route');
var Router = require('./router');

/**
 * Expose `createApplication()`.
 */
/* 这里是 express 的入口 */
exports = module.exports = createApplication;

/**
 * Create an express application.
 *
 * @return {Function}
 * @api public
 */
/* 基本使用：https://www.runoob.com/nodejs/nodejs-express-framework.html 
  var express = require('express');
  var app = express();
  
  app.get('/', function (req, res) {
    res.send('Hello World');
  })
  
  var server = app.listen(8081, function () {
  
    var host = server.address().address
    var port = server.address().port
  
    console.log("应用实例，访问地址为 http://%s:%s", host, port)
  
  })
*/
function createApplication() {
  /* 执行 var express = require('express'); var app = express(); 返回 app */
  var app = function(req, res, next) {
    app.handle(req, res, next);
  };

  /* 此 app 对象混入 EventEmitter.prototype 上的属性和方法 */
  mixin(app, EventEmitter.prototype, false);
  /* 此 app 对象混入 application.js 上的属性和方法 */
  mixin(app, proto, false);

  // expose the prototype that will get set on requests
  /* 定义数据属性，即：app.request = app */
  app.request = Object.create(req, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
  })

  // expose the prototype that will get set on responses
  /* 定义数据属性，即：app.response = res */
  app.response = Object.create(res, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
  })

  /* 这里会内部调用 app 上的 init 方法 */
  app.init();
  return app;
}

/**
 * Expose the prototypes.
 */
/* 暴露处理请求和响应的方法 */
exports.application = proto;
exports.request = req;
exports.response = res;

/**
 * Expose constructors.
 */
/* 暴露处理路由的方法 */
exports.Route = Route;
exports.Router = Router;

/**
 * Expose middleware
 */
/* 暴露中间件 */
exports.json = bodyParser.json
exports.query = require('./middleware/query');
exports.raw = bodyParser.raw
exports.static = require('serve-static');
exports.text = bodyParser.text
exports.urlencoded = bodyParser.urlencoded

/**
 * Replace removed middleware with an appropriate error message.
 */
/* 被移除的中间件 */
var removedMiddlewares = [
  'bodyParser',
  'compress',
  'cookieSession',
  'session',
  'logger',
  'cookieParser',
  'favicon',
  'responseTime',
  'errorHandler',
  'timeout',
  'methodOverride',
  'vhost',
  'csrf',
  'directory',
  'limit',
  'multipart',
  'staticCache'
]

/* 在 exports 上定义移除中间件的名称，在从此库中引用中间的时候，就会报错 */
removedMiddlewares.forEach(function (name) {
  Object.defineProperty(exports, name, {
    get: function () {
      throw new Error('Most middleware (like ' + name + ') is no longer bundled with Express and must be installed separately. Please see https://github.com/senchalabs/connect#middleware.');
    },
    configurable: true
  });
});
