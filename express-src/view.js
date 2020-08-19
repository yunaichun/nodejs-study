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
var debug = require('debug')('express:view');
/* Node.js 工具类 - 路径【http://nodejs.cn/api/path.html#path_path_basename_path_ext】 */
var path = require('path');
/* Node.js 工具类 - 文件【http://nodejs.cn/api/fs.html】 */
var fs = require('fs');

/**
 * Module variables.
 * @private
 */

var dirname = path.dirname;
var basename = path.basename;
var extname = path.extname;
var join = path.join;
var resolve = path.resolve;

/**
 * Module exports.
 * @public
 */

module.exports = View;

/**
 * Initialize a new `View` with the given `name`.
 *
 * Options:
 *
 *   - `defaultEngine` the default template engine name
 *   - `engines` template engine require() cache
 *   - `root` root path for view lookup
 *
 * @param {string} name
 * @param {object} options
 * @public
 */
/* 使用方法：application.js 的 render 方法调用
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'jade');
  res.render('index');
 */
function View(name, options) {
  var opts = options || {};

  /* 模版引擎：this.get('view engine') */
  this.defaultEngine = opts.defaultEngine;
  /* 扩展文件名 */
  this.ext = extname(name);
  this.name = name;
  /* 页面所有视图：this.get('views') */
  this.root = opts.root;

  /* 文件扩展名和模版引擎至少有一个存在 */
  if (!this.ext && !this.defaultEngine) {
    throw new Error('No default engine was specified and no extension was provided.');
  }

  var fileName = name;

  /* 没有传文件扩展名的话，如：
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'jade');
    res.render('index'); 

    => 可以得出 this.ext 为 .jade
  */
  if (!this.ext) {
    // get extension from default engine name
    this.ext = this.defaultEngine[0] !== '.'
      ? '.' + this.defaultEngine
      : this.defaultEngine;

    /* fileName 还是保证有扩展名存在的 */
    fileName += this.ext;
  }

  /* opts.engines 来自哪里【application.js 设置模版引擎：】
    1、app.engine('ejs', require('ejs').__express);
      this.engines[extension] = fn;
      => 即得到 ejs 的模版引擎为 require('ejs').__express
  */
  if (!opts.engines[this.ext]) {
    // load engine
    /* this.ext 是包含 . 的名称 */
    var mod = this.ext.substr(1)
    debug('require "%s"', mod)

    // default engine export
    /* 引用模版引擎 */
    var fn = require(mod).__express

    /* 每个模版引擎上都有一个 __express 属性，应该为一个函数 */
    if (typeof fn !== 'function') {
      throw new Error('Module "' + mod + '" does not provide a view engine.')
    }

    opts.engines[this.ext] = fn
  }

  // store loaded engine
  /* 设置当前模版引擎，缓存下来 */
  this.engine = opts.engines[this.ext];

  // lookup path
  /* 在 render 函数中调用 */
  /* fileName 为完整文件名，包含扩展名 */
  this.path = this.lookup(fileName);
}

/**
 * Lookup view by the given `name`
 *
 * @param {string} name
 * @private
 */
/* 返回当前文件的绝对路径 */
View.prototype.lookup = function lookup(name) {
  var path;
  /* 页面所有视图：this.get('views') */
  var roots = [].concat(this.root);

  debug('lookup "%s"', name);

  /* 遍历模版文件目录 */
  for (var i = 0; i < roots.length && !path; i++) {
    var root = roots[i];

    // resolve the path
    var loc = resolve(root, name);
    var dir = dirname(loc); /* 绝对路径 */
    var file = basename(loc); /* 文件名 */

    // resolve the file
    path = this.resolve(dir, file);
  }

  /* 返回当前文件的绝对路径 */
  return path;
};

/**
 * Render with the given options.
 *
 * @param {object} options
 * @param {function} callback
 * @private
 */
/* 调用模版引擎的 render 方法，去渲染页面 */
View.prototype.render = function render(options, callback) {
  debug('render "%s"', this.path);
  /* 解析：
    1、this.engine = opts.engines[this.ext]
    => require(mod).__express
    2、传入文件绝对路径、options 参数、callback参数 
  */
  this.engine(this.path, options, callback);
};

/**
 * Resolve the file within the given directory.
 *
 * @param {string} dir
 * @param {string} file
 * @private
 */
View.prototype.resolve = function resolve(dir, file) {
  /* 当前模版引擎的扩展名 */
  var ext = this.ext;

  // <path>.<ext>
  /* 拼接路径 */
  var path = join(dir, file);
  var stat = tryStat(path);

  /* 拼接路径是文件的话，返回此绝对路径 */
  if (stat && stat.isFile()) {
    return path;
  }

  // <path>/index.<ext>
  /* 可以直接传目录，会自动索引到当前目录的 `index${ext}` */
  path = join(dir, basename(file, ext), 'index' + ext);
  stat = tryStat(path);
  if (stat && stat.isFile()) {
    return path;
  }
};

/**
 * Return a stat, maybe.
 *
 * @param {string} path
 * @return {fs.Stats}
 * @private
 */
/* 读取文件的状态 */
function tryStat(path) {
  debug('stat "%s"', path);

  try {
    /* 读取文件的状态 */
    return fs.statSync(path);
  } catch (e) {
    return undefined;
  }
}
