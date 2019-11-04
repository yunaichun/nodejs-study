/*js 调试工具: 会添加统一前缀【https://www.npmjs.com/package/debug】*/
var debug = require('debug')('koa-router');
/* 动态路由解析
  const regexp = pathToRegexp('/:foo/:bar')
  keys = [
    { name: 'foo', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?'  }, 
    { name: 'bar', prefix: '/', ... }
  ]
 */
var pathToRegExp = require('path-to-regexp');
/* 解析 url 查询参数的【https://www.npmjs.com/package/urijs】 */
var uri = require('urijs');

module.exports = Layer;

/**
 * Initialize a new routing Layer with given `method`, `path`, and `middleware`.
 *
 * @param {String|RegExp} path Path string or regular expression.
 * @param {Array} methods Array of HTTP verbs.
 * @param {Array} middleware Layer callback/middleware or series of.
 * @param {Object=} opts
 * @param {String=} opts.name route name
 * @param {String=} opts.sensitive case sensitive (default: false)
 * @param {String=} opts.strict require the trailing slash (default: false)
 * @returns {Layer}
 * @private
 */
function Layer(path, methods, middleware, opts) {
  this.opts = opts || {};
  /* 路由命名 */
  this.name = this.opts.name || null;
  /* 路由参数名数组 */
  this.paramNames = [];

  /* 保存 method 方法名 */
  this.methods = [];
  /* stack 存储的是当前方法的中间件 函数 */
  this.stack = Array.isArray(middleware) ? middleware : [middleware];

  methods.forEach(function(method) {
    /* 保存 method 方法名 */
    var l = this.methods.push(method.toUpperCase());
    /* methods 数组里最后一项是 GET 请求的话，在 methods 第一位添加 HEAD */
    if (this.methods[l-1] === 'GET') {
      this.methods.unshift('HEAD');
    }
  }, this);

  // ensure middleware is a function
  this.stack.forEach(function(fn) {
    /* 中间件必须是函数 */
    var type = (typeof fn);
    if (type !== 'function') {
      throw new Error(
        methods.toString() + " `" + (this.opts.name || path) +"`: `middleware` "
        + "must be a function, not `" + type + "`"
      );
    }
  }, this);

  /* 请求路径 */
  this.path = path;
  /* 路径解析 */
  this.regexp = pathToRegExp(path, this.paramNames, this.opts);

  debug('defined route %s %s', this.methods, this.opts.prefix + this.path);
};

/**
 * Returns whether request `path` matches route.
 *
 * @param {String} path
 * @returns {Boolean}
 * @private
 */
/* 路由匹配 */
Layer.prototype.match = function (path) {
  return this.regexp.test(path);
};

/**
 * Returns map of URL parameters for given `path` and `paramNames`.
 *
 * @param {String} path
 * @param {Array.<String>} captures
 * @param {Object=} existingParams
 * @returns {Object}
 * @private
 */
Layer.prototype.params = function (path, captures, existingParams) {
  var params = existingParams || {};

  for (var len = captures.length, i=0; i<len; i++) {
    /* this.paramNames 路由参数名数组 */
    if (this.paramNames[i]) {
      var c = captures[i];
      params[this.paramNames[i].name] = c ? safeDecodeURIComponent(c) : c;
    }
  }

  return params;
};

/**
 * Returns array of regexp url path captures.
 *
 * @param {String} path
 * @returns {Array.<String>}
 * @private
 */
Layer.prototype.captures = function (path) {
  /* 获取匹配的 url */
  if (this.opts.ignoreCaptures) return [];
  return path.match(this.regexp).slice(1);
};

/**
 * Prefix route path.
 *
 * @param {String} prefix
 * @returns {Layer}
 * @private
 */
Layer.prototype.setPrefix = function (prefix) {
  if (this.path) {
    /* 设置 path 的前缀 prefix */
    this.path = prefix + this.path;
    /* 重置：路由参数名数组 */
    this.paramNames = [];
    /* 重置路径解析 */
    this.regexp = pathToRegExp(this.path, this.paramNames, this.opts);
  }

  return this;
};


/**
 * Generate URL for route using given `params`.
 *
 * @example
 *
 * ```javascript
 * const route = new Layer('/users/:id', ['GET'], fn);
 *
 * route.url({ id: 123 }); // => "/users/123"
 * ```
 *
 * @param {Object} params url parameters
 * @returns {String}
 * @private
 */
Layer.prototype.url = function (params, options) {
  var args = params;
  var url = this.path.replace(/\(\.\*\)/g, '');
  var toPath = pathToRegExp.compile(url);
  var replaced;

  /* params 不是 标准的对象，这里会抽出来 options */
  if (typeof params != 'object') {
    /* args 为传进来的参数，为数组 */
    args = Array.prototype.slice.call(arguments);
    /* args 最后一项为对象的话 */
    if (typeof args[args.length - 1] == 'object') {
      options = args[args.length - 1];
      args = args.slice(0, args.length - 1);
    }
  }

  var tokens = pathToRegExp.parse(url);
  var replace = {};

  /* args 是数组的话 */
  if (args instanceof Array) {
    /* replace 里面存储 tokens[i].name 对应的 args 项 */
    for (var len = tokens.length, i=0, j=0; i<len; i++) {
      if (tokens[i].name) replace[tokens[i].name] = args[j++];
    }
  } else if (tokens.some(token => token.name)) {
    /* tokens 数组存在 name */
    replace = params;
  } else {
    /* tokens 数组不存在 name */
    options = params;
  }

  /* 编译出替换的字符串 replaced */
  replaced = toPath(replace);

  if (options && options.query) {
    var replaced = new uri(replaced)
    replaced.search(options.query);
    return replaced.toString();
  }

  return replaced;
};

/**
 * Run validations on route named parameters.
 *
 * @example
 *
 * ```javascript
 * router
 *   .param('user', function (id, ctx, next) {
 *     ctx.user = users[id];
 *     if (!user) return ctx.status = 404;
 *     next();
 *   })
 *   .get('/users/:user', function (ctx, next) {
 *     ctx.body = ctx.user;
 *   });
 * ```
 *
 * @param {String} param
 * @param {Function} middleware
 * @returns {Layer}
 * @private
 */
Layer.prototype.param = function (param, fn) {
  /* stack 存储的是当前方法的中间件 函数 */
  var stack = this.stack;
  /* 路由参数名数组 */
  var params = this.paramNames;
  /* 中间件的封装一层 */
  var middleware = function (ctx, next) {
    /* 这里传入三个参数 */
    return fn.call(this, ctx.params[param], ctx, next);
  };
  middleware.param = param;

  /* 路由参数名数组 */
  var names = params.map(function (p) {
    return p.name;
  });

  /* 传入的参数 param 在 路由参数名数组 中的 index */
  var x = names.indexOf(param);
  if (x > -1) {
    // iterate through the stack, to figure out where to place the handler fn
    stack.some(function (fn, i) {
      // param handlers are always first, so when we find an fn w/o a param property, stop here
      // if the param handler at this part of the stack comes after the one we are adding, stop here
      if (!fn.param || names.indexOf(fn.param) > x) {
        // inject this param handler right before the current item
        /* 在位置 i 插入 中间件 middleware！！！！！！！ */
        stack.splice(i, 0, middleware);
        return true; // then break the loop
      }
    });
  }

  return this;
};

/**
 * Safe decodeURIComponent, won't throw any error.
 * If `decodeURIComponent` error happen, just return the original value.
 *
 * @param {String} text
 * @returns {String} URL decode original string.
 * @private
 */
function safeDecodeURIComponent(text) {
  try {
    /* decodeURIComponent() 函数可对 encodeURIComponent() 函数编码的 URI 进行解码。 */
    return decodeURIComponent(text);
  } catch (e) {
    return text;
  }
}
