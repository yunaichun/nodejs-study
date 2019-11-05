/**
 * RESTful resource routing middleware for koa.
 *
 * @author Alex Mingoia <talk@alexmingoia.com>
 * @link https://github.com/alexmingoia/koa-router
 */
/*js 调试工具: 会添加统一前缀【https://www.npmjs.com/package/debug】*/
var debug = require('debug')('koa-router');
/*中间件的函数数组【https://github.com/koajs/compose】*/
var compose = require('koa-compose');
/* node 请求异常处理模块【https://www.npmjs.com/package/http-errors】 */
var HttpError = require('http-errors');
/* http 请求所有的方法【https://www.npmjs.com/package/methods】 */
var methods = require('methods');
var Layer = require('./layer');

/**
 * @module koa-router
 */
/* 对外暴露 Router 构造函数 */
module.exports = Router;

/** 一、koa 中使用 koa-router
 * Create a new router.
 *
 * @example
 *
 * Basic usage:
 *
 * ```javascript
 * const Koa = require('koa');
 * const Router = require('@koa/router');
 *
 * const app = new Koa();
 * const router = new Router();
 *
 * router.get('/', (ctx, next) => {
 *   // ctx.router available
 * });
 *
 * app
 *   .use(router.routes())
 *   .use(router.allowedMethods());
 * ```
 *
 * @alias module:koa-router
 * @param {Object=} opts
 * @param {String=} opts.prefix prefix router paths
 * @constructor
 */
function Router(opts) {
  /* 默认实例化 */
  if (!(this instanceof Router)) {
    return new Router(opts);
  }

  this.opts = opts || {};
  this.methods = this.opts.methods || [
    'HEAD',
    'OPTIONS',
    'GET',
    'PUT',
    'PATCH',
    'POST',
    'DELETE'
  ];

  this.params = {};
  /* stack 存储的是 Layer 实例 */
  this.stack = [];
};






/** 二、router 方法的使用
 * Create `router.verb()` methods, where *verb* is one of the HTTP verbs such
 * as `router.get()` or `router.post()`.
 *
 * Match URL patterns to callback functions or controller actions using `router.verb()`,
 * where **verb** is one of the HTTP verbs such as `router.get()` or `router.post()`.
 *
 * Additionaly, `router.all()` can be used to match against all methods.
 *
 * 2.1 所有 http 请求方法，支持链式调用
 * ```javascript
 * router
 *   .get('/', (ctx, next) => {
 *     ctx.body = 'Hello World!';
 *   })
 *   .post('/users', (ctx, next) => {
 *     // ...
 *   })
 *   .put('/users/:id', (ctx, next) => {
 *     // ...
 *   })
 *   .del('/users/:id', (ctx, next) => {
 *     // ...
 *   })
 *   .all('/users/:id', (ctx, next) => {
 *     // ...
 *   });
 * ```
 *
 * When a route is matched, its path is available at `ctx._matchedRoute` and if named,
 * the name is available at `ctx._matchedRouteName`
 *
 * Route paths will be translated to regular expressions using
 * [path-to-regexp](https://github.com/pillarjs/path-to-regexp).
 *
 * Query strings will not be considered when matching requests.
 *
 * 2.2 含有名称的路由
 * #### Named routes
 *
 * Routes can optionally have names. This allows generation of URLs and easy
 * renaming of URLs during development.
 *
 * ```javascript
 * router.get('user', '/users/:id', (ctx, next) => {
 *  // ...
 * });
 *
 * router.url('user', 3);
 * // => "/users/3"
 * ```
 *
 * 2.3、路由多级回调
 * #### Multiple middleware
 *
 * Multiple middleware may be given:
 *
 * ```javascript
 * router.get(
 *   '/users/:id',
 *   (ctx, next) => {
 *     return User.findOne(ctx.params.id).then(function(user) {
 *       ctx.user = user;
 *       next();
 *     });
 *   },
 *   ctx => {
 *     console.log(ctx.user);
 *     // => { id: 17, name: "Alex" }
 *   }
 * );
 * ```
 *
 * 2.4 嵌套路由
 * ### Nested routers
 *
 * Nesting routers is supported:
 *
 * ```javascript
 * const forums = new Router();
 * const posts = new Router();
 *
 * posts.get('/', (ctx, next) => {...});
 * posts.get('/:pid', (ctx, next) => {...});
 * forums.use('/forums/:fid/posts', posts.routes(), posts.allowedMethods());
 *
 * // responds to "/forums/123/posts" and "/forums/123/posts/123"
 * app.use(forums.routes());
 * ```
 *
 * 2.5 路由添加全局前缀
 * #### Router prefixes
 *
 * Route paths can be prefixed at the router level:
 *
 * ```javascript
 * const router = new Router({
 *   prefix: '/users'
 * });
 *
 * router.get('/', ...); // responds to "/users"
 * router.get('/:id', ...); // responds to "/users/:id"
 * ```
 *
 * 2.6 动态路由参数获取【ctx.params】
 * #### URL parameters
 *
 * Named route parameters are captured and added to `ctx.params`.
 *
 * ```javascript
 * router.get('/:category/:title', (ctx, next) => {
 *   console.log(ctx.params);
 *   // => { category: 'programming', title: 'how-to-node' }
 * });
 * ```
 *
 * The [path-to-regexp](https://github.com/pillarjs/path-to-regexp) module is
 * used to convert paths to regular expressions.
 *
 * @name get|put|post|patch|delete|del
 * @memberof module:koa-router.prototype
 * @param {String} path
 * @param {Function=} middleware route middleware(s)
 * @param {Function} callback route callback
 * @returns {Router}
 */
/* Router 上添加 http.METHODS 所有方法*/
methods.forEach(function (method) {
  Router.prototype[method] = function (name, path, middleware) {
    var middleware;

    if (typeof path === 'string' || path instanceof RegExp) {
      /* 三个参数：将中间件取出来 */
      middleware = Array.prototype.slice.call(arguments, 2);
    } else {
      /* 两个参数：没有 name */
      middleware = Array.prototype.slice.call(arguments, 1);
      path = name;
      name = null;
    }

    /* 注册 
      1、router.get('/test', async (ctx, next) => {}); 等价于 2
      2、router.register('/test', ['GET'], [async (ctx, next) => {}], { name: null });
    */
    this.register(path, [method], middleware, {
      name: name
    });

    /* 对于多个路径的请求，koa-router 也支持链式调用 */
    return this;
  };
});

// Alias for `router.delete()` because delete is a reserved word
Router.prototype.del = Router.prototype['delete'];

/**
 * Create and register a route.
 *
 * @param {String} path Path string.
 * @param {Array.<String>} methods Array of HTTP verbs.
 * @param {Function} middleware Multiple middleware also accepted.
 * @returns {Layer}
 * @private
 */
/* 注册路由 */
Router.prototype.register = function (path, methods, middleware, opts) {
  opts = opts || {};

  var router = this;
  var stack = this.stack;

  // support array of paths
  if (Array.isArray(path)) {
    /* 注册路由的 path 路径支持数组 */
    path.forEach(function (p) {
      /* 循环注册每一项 */
      router.register.call(router, p, methods, middleware, opts);
    });

    return this;
  }

  // create route
  /* register 的功能核心的代码全部都交由 Layer 类去完成 */
  var route = new Layer(path, methods, middleware, {
    end: opts.end === false ? opts.end : true,
    name: opts.name,
    sensitive: opts.sensitive || this.opts.sensitive || false,
    strict: opts.strict || this.opts.strict || false,
    prefix: opts.prefix || this.opts.prefix || "",
    ignoreCaptures: opts.ignoreCaptures
  });

  if (this.opts.prefix) {
    /* 设置 path 的前缀 prefix */
    route.setPrefix(this.opts.prefix);
  }

  // add parameter middleware
  /* 在指定位置插入中间件 */
  Object.keys(this.params).forEach(function (param) {
    route.param(param, this.params[param]);
  }, this);

  /* stack 存储的是 Layer 实例 */
  stack.push(route);

  /* 返回 route 实例 */
  return route;
};

/**
 * Match given `path` and return corresponding routes.
 *
 * @param {String} path
 * @param {String} method
 * @returns {Object.<path, pathAndMethod>} returns layers that matched path and
 * path and method.
 * @private
 */
/* 请求过来了, 请求是怎么匹配然后进行到相对应的处理函数 */
Router.prototype.match = function (path, method) {
  /* 取所有路由 Layer 实例 */
  var layers = this.stack;
  var layer;
  /* 匹配结果 */
  var matched = {
    path: [],
    pathAndMethod: [],
    route: false
  };

  /* 遍历路由 Router 的 stack 逐个判断 */
  for (var len = layers.length, i = 0; i < len; i++) {
    layer = layers[i];

    debug('test %s %s', layer.path, layer.regexp);
    /* 这里是使用由路由字符串生成的正则表达式判断当前路径是否符合该正则 */
    if (layer.match(path)) {
      /* 将对应的 Layer 实例加入到结果集的 path 数组中 */
      matched.path.push(layer);

      /* 如果对应的 layer 实例中 methods 数组为空或者数组中有找到对应的方法 */
      if (layer.methods.length === 0 || ~layer.methods.indexOf(method)) {
       /*  将 layer 放入到结果集的 pathAndMethod 中 */
        matched.pathAndMethod.push(layer);
        /* 这里是用于判断是否有真正匹配到路由处理函数
        因为像 router.use(session()); 这样的中间件也是通过 Layer 来管理的, 它们的 methods 数组为空 */
        if (layer.methods.length) matched.route = true;
      }
    }
  }

  /* 通过上面返回的结果集, 我们知道一个请求来临的时候, 我们可以使用正则来匹配路由是否符合, 
  然后在 path 数组或者 pathAndMethod 数组中找到对应的 Layer 实例对象. */
  return matched;
};

/**
 * Returns router middleware which dispatches a route matching the request.
 *
 * @returns {Function}
 */
/* 添加路由中间件：
const Koa = require('koa');
const KoaRouter = require('koa-router');

const app = new Koa();
// 创建 router 实例对象
const router = new KoaRouter();

//注册路由
router.get('/', async (ctx, next) => {
  console.log('index');
  ctx.body = 'index';
});

app.use(router.routes());  // 添加路由中间件
app.use(router.allowedMethods()); // 对请求进行一些限制处理

app.listen(3000);

在上面注册好了路由之后, 我们就可以使用 router.routes 来将路由模块添加到 koa 的中间件处理机制当中了. 
由于 koa 的中间件插件是以一个函数的形式存在的, 所以 routes 函数返回值就是一个函数.
 */
Router.prototype.routes = Router.prototype.middleware = function () {
  var router = this;

  var dispatch = function dispatch(ctx, next) {
    debug('%s %s', ctx.method, ctx.path);

    var path = router.opts.routerPath || ctx.routerPath || ctx.path;
    /* 根据 path 值取的匹配的路由 Layer 实例对象 */
    var matched = router.match(path, ctx.method);
    var layerChain, layer, i;

    /* 匹配上了 path 路径 */
    if (ctx.matched) {
      ctx.matched.push.apply(ctx.matched, matched.path);
    } else {
      ctx.matched = matched.path;
    }

    ctx.router = router;
    /* 果没有匹配到对应的路由模块, 那么就直接跳过下面的逻辑 */
    if (!matched.route) return next();


    /* 取路径与方法都匹配了的 Layer 实例对象 */
    var matchedLayers = matched.pathAndMethod
    var mostSpecificLayer = matchedLayers[matchedLayers.length - 1]
    ctx._matchedRoute = mostSpecificLayer.path;
    if (mostSpecificLayer.name) {
      ctx._matchedRouteName = mostSpecificLayer.name;
    }


    /* 构建路径对应路由的处理中间件函数数组
      这里的目的是在每个匹配的路由对应的中间件处理函数数组前添加一个用于处理
      对应路由的 captures, params, 以及路由命名的函数 
    */
    layerChain = matchedLayers.reduce(function(memo, layer) {
      memo.push(function(ctx, next) {
        /* captures 是存储路由中参数的值的数组 */
        ctx.captures = layer.captures(path, ctx.captures);
        /* params 是一个对象, 键为参数名, 根据参数名可以获取路由中的参数值, 值从 captures 中拿 */
        ctx.params = layer.params(path, ctx.captures, ctx.params);
        ctx.routerName = layer.name;
        return next();
      });
      return memo.concat(layer.stack);
    }, []);


    /* 使用 compose 模块将对应路由的处理中间件数组中的函数逐个执行
    当路由的处理函数中间件函数全部执行完, 再调用上一层级的 next 函数进入下一个中间件 */
    return compose(layerChain)(ctx, next);
  };


  dispatch.router = this;
  /* 返回一个函数，供 koa 中间件使用 */
  return dispatch;
};

/**
 * Returns separate middleware for responding to `OPTIONS` requests with
 * an `Allow` header containing the allowed methods, as well as responding
 * with `405 Method Not Allowed` and `501 Not Implemented` as appropriate.
 *
 * @example
 *
 * ```javascript
 * const Koa = require('koa');
 * const Router = require('@koa/router');
 *
 * const app = new Koa();
 * const router = new Router();
 *
 * app.use(router.routes());
 * app.use(router.allowedMethods());
 * ```
 *
 * **Example with [Boom](https://github.com/hapijs/boom)**
 *
 * ```javascript
 * const Koa = require('koa');
 * const Router = require('@koa/router');
 * const Boom = require('boom');
 *
 * const app = new Koa();
 * const router = new Router();
 *
 * app.use(router.routes());
 * app.use(router.allowedMethods({
 *   throw: true,
 *   notImplemented: () => new Boom.notImplemented(),
 *   methodNotAllowed: () => new Boom.methodNotAllowed()
 * }));
 * ```
 *
 * @param {Object=} options
 * @param {Boolean=} options.throw throw error instead of setting status and header
 * @param {Function=} options.notImplemented throw the returned value in place of the default NotImplemented error
 * @param {Function=} options.methodNotAllowed throw the returned value in place of the default MethodNotAllowed error
 * @returns {Function}
 */
/* 对于 allowedMethod 方法来说, 它的作用就是用于处理请求的错误, 
所以它作为路由模块的最后一个函数来执行. */
Router.prototype.allowedMethods = function (options) {
  options = options || {};
  var implemented = this.methods;

  /* 返回一个函数 */
  return function allowedMethods(ctx, next) {
    /* 从这里可以看出, allowedMethods 函数是用于在中间件机制中处理返回结果的函数
    先执行 next 函数, next 函数返回的是一个 Promise 对象 */
    return next().then(function() {
      var allowed = {};

      /* allowedMethods 函数的逻辑建立在 statusCode 没有设置或者值为 404 的时候 */
      if (!ctx.status || ctx.status === 404) {
        /* 这里的 matched 就是在 match 函数执行之后返回结果集中的 path 数组
        也就是说请求路径与路由正则匹配的 layer 实例对象数组*/
        ctx.matched.forEach(function (route) {
          route.methods.forEach(function (method) {
            /* 将这些 layer 路由的 HTTP 方法存储起来 */
            allowed[method] = method;
          });
        });


        /* 将上面的 allowed 整理为数组 */
        var allowedArr = Object.keys(allowed);
        /* 如果该方法不被允许 :
        implemented 就是 Router 配置中的 methods 数组, 也就是允许的方法
        这里通过 ~ 运算判断当前的请求方法是否在配置允许的方法中
        */
        if (!~implemented.indexOf(ctx.method)) {
          /* 如果 Router 配置中配置 throw 为 true */
          if (options.throw) {
            var notImplementedThrowable;
            /* 如果配置中规定了 throw 抛出错误的函数, 那么就执行对应的函数 */
            if (typeof options.notImplemented === 'function') {
              notImplementedThrowable = options.notImplemented(); // set whatever the user returns from their function
            } else {
              /* 如果没有则直接抛出 HTTP Error */
              notImplementedThrowable = new HttpError.NotImplemented();
            }
            /* 抛出错误 */
            throw notImplementedThrowable;
          } else {
            /* Router 配置 throw 为 false
            设置状态码为 501 */
            ctx.status = 501;
            /* 并且设置 Allow 头部, 值为上面得到的允许的方法数组 allowedArr */
            ctx.set('Allow', allowedArr.join(', '));
          }
        } else if (allowedArr.length) {
          /*  如果该方法被允许 :
          来到这里说明该请求的方法是被允许的, 那么为什么会没有状态码 statusCode 或者 statusCode 为 404 呢?
          原因在于除却特殊情况, 我们一般在业务逻辑里面不会处理 OPTIONS 请求的
          发出这个请求一般常见就是非简单请求, 则会发出预检请求 OPTIONS
          例如 application/json 格式的 POST 请求 
          */
          if (ctx.method === 'OPTIONS') {
            /* 如果是 OPTIONS 请求, 状态码为 200, 然后设置 Allow 头部, 值为允许的方法数组 methods */
            ctx.status = 200;
            ctx.body = '';
            ctx.set('Allow', allowedArr.join(', '));
          } else if (!allowed[ctx.method]) {
            /* 方法不被被服务端允许 */
            if (options.throw) {
              var notAllowedThrowable;
              if (typeof options.methodNotAllowed === 'function') {
                notAllowedThrowable = options.methodNotAllowed(); // set whatever the user returns from their function
              } else {
                notAllowedThrowable = new HttpError.MethodNotAllowed();
              }
              /* 抛出异常 */
              throw notAllowedThrowable;
            } else {
              /* 状态码改为 405 */
              ctx.status = 405;
              ctx.set('Allow', allowedArr.join(', '));
            }
          }
        }
      }
    });
  };
};

/**
 * Use given middleware.
 *
 * Middleware run in the order they are defined by `.use()`. They are invoked
 * sequentially, requests start at the first middleware and work their way
 * "down" the middleware stack.
 *
 * @example
 *
 * ```javascript
 * // session middleware will run before authorize
 * router
 *   .use(session())
 *   .use(authorize());
 *
 * // use middleware only with given path
 * router.use('/users', userAuth());
 *
 * // or with an array of paths
 * router.use(['/users', '/admin'], userAuth());
 *
 * app.use(router.routes());
 * ```
 *
 * @param {String=} path
 * @param {Function} middleware
 * @param {Function=} ...
 * @returns {Router}
 */
Router.prototype.use = function () {
  /* 获取 use 的中间件 */
  var router = this;
  var middleware = Array.prototype.slice.call(arguments);
  var path;

  // support array of paths
  /* 路径为数组形式：router.use(['/users', '/admin'], userAuth()) */
  if (Array.isArray(middleware[0]) && typeof middleware[0][0] === 'string') {
    middleware[0].forEach(function (p) {
      /* 
      1、[p].concat(middleware.slice(1)) => ['/users', '/admin', userAuth()]
      2、重新调用 use 方法 => router.use('/users', '/admin', userAuth());
      */
      router.use.apply(router, [p].concat(middleware.slice(1)));
    });
    return this;
  }

  /* 此时统一了传参：数组的路径全部变为字符串传进来了 */
  var hasPath = typeof middleware[0] === 'string';
  if (hasPath) {
    /* 将路径拿出来 */
    path = middleware.shift();
  }

  middleware.forEach(function (m) {
    if (m.router) {
      m.router.stack.forEach(function (nestedLayer) {
        if (path) nestedLayer.setPrefix(path);
        if (router.opts.prefix) nestedLayer.setPrefix(router.opts.prefix);
        router.stack.push(nestedLayer);
      });

      if (router.params) {
        Object.keys(router.params).forEach(function (key) {
          m.router.param(key, router.params[key]);
        });
      }
    } else {
      router.register(path || '(.*)', [], m, { end: false, ignoreCaptures: !hasPath });
    }
  });

  /* 返回 this 之后可以链式调用 */
  return this;
};

/**
 * Set the path prefix for a Router instance that was already initialized.
 *
 * @example
 *
 * ```javascript
 * router.prefix('/things/:thing_id')
 * ```
 *
 * @param {String} prefix
 * @returns {Router}
 */
Router.prototype.prefix = function (prefix) {
  prefix = prefix.replace(/\/$/, '');

  this.opts.prefix = prefix;

  this.stack.forEach(function (route) {
    route.setPrefix(prefix);
  });

  return this;
};

/**
 * Register route with all methods.
 *
 * @param {String} name Optional.
 * @param {String} path
 * @param {Function=} middleware You may also pass multiple middleware.
 * @param {Function} callback
 * @returns {Router}
 * @private
 */
Router.prototype.all = function (name, path, middleware) {
  var middleware;

  if (typeof path === 'string') {
    middleware = Array.prototype.slice.call(arguments, 2);
  } else {
    middleware = Array.prototype.slice.call(arguments, 1);
    path = name;
    name = null;
  }

  this.register(path, methods, middleware, {
    name: name
  });

  return this;
};

/**
 * Redirect `source` to `destination` URL with optional 30x status `code`.
 *
 * Both `source` and `destination` can be route names.
 *
 * ```javascript
 * router.redirect('/login', 'sign-in');
 * ```
 *
 * This is equivalent to:
 *
 * ```javascript
 * router.all('/login', ctx => {
 *   ctx.redirect('/sign-in');
 *   ctx.status = 301;
 * });
 * ```
 *
 * @param {String} source URL or route name.
 * @param {String} destination URL or route name.
 * @param {Number=} code HTTP status code (default: 301).
 * @returns {Router}
 */
Router.prototype.redirect = function (source, destination, code) {
  // lookup source route by name
  if (source[0] !== '/') {
    source = this.url(source);
  }

  // lookup destination route by name
  if (destination[0] !== '/') {
    destination = this.url(destination);
  }

  return this.all(source, ctx => {
    ctx.redirect(destination);
    ctx.status = code || 301;
  });
};

/**
 * Lookup route with given `name`.
 *
 * @param {String} name
 * @returns {Layer|false}
 */
Router.prototype.route = function (name) {
  var routes = this.stack;

  for (var len = routes.length, i=0; i<len; i++) {
    if (routes[i].name && routes[i].name === name) {
      return routes[i];
    }
  }

  return false;
};

/**
 * Generate URL for route. Takes a route name and map of named `params`.
 *
 * @example
 *
 * ```javascript
 * router.get('user', '/users/:id', (ctx, next) => {
 *   // ...
 * });
 *
 * router.url('user', 3);
 * // => "/users/3"
 *
 * router.url('user', { id: 3 });
 * // => "/users/3"
 *
 * router.use((ctx, next) => {
 *   // redirect to named route
 *   ctx.redirect(ctx.router.url('sign-in'));
 * })
 *
 * router.url('user', { id: 3 }, { query: { limit: 1 } });
 * // => "/users/3?limit=1"
 *
 * router.url('user', { id: 3 }, { query: "limit=1" });
 * // => "/users/3?limit=1"
 * ```
 *
 * @param {String} name route name
 * @param {Object} params url parameters
 * @param {Object} [options] options parameter
 * @param {Object|String} [options.query] query options
 * @returns {String|Error}
 */
Router.prototype.url = function (name, params) {
  var route = this.route(name);

  if (route) {
    var args = Array.prototype.slice.call(arguments, 1);
    return route.url.apply(route, args);
  }

  return new Error("No route found for name: " + name);
};

/**
 * Run middleware for named route parameters. Useful for auto-loading or
 * validation.
 *
 * @example
 *
 * ```javascript
 * router
 *   .param('user', (id, ctx, next) => {
 *     ctx.user = users[id];
 *     if (!ctx.user) return ctx.status = 404;
 *     return next();
 *   })
 *   .get('/users/:user', ctx => {
 *     ctx.body = ctx.user;
 *   })
 *   .get('/users/:user/friends', ctx => {
 *     return ctx.user.getFriends().then(function(friends) {
 *       ctx.body = friends;
 *     });
 *   })
 *   // /users/3 => {"id": 3, "name": "Alex"}
 *   // /users/3/friends => [{"id": 4, "name": "TJ"}]
 * ```
 *
 * @param {String} param
 * @param {Function} middleware
 * @returns {Router}
 */
Router.prototype.param = function (param, middleware) {
  this.params[param] = middleware;
  this.stack.forEach(function (route) {
    route.param(param, middleware);
  });
  return this;
};

/**
 * Generate URL from url pattern and given `params`.
 *
 * @example
 *
 * ```javascript
 * const url = Router.url('/users/:id', {id: 1});
 * // => "/users/1"
 * ```
 *
 * @param {String} path url pattern
 * @param {Object} params url parameters
 * @returns {String}
 */
Router.url = function (path, params) {
    var args = Array.prototype.slice.call(arguments, 1);
    return Layer.prototype.url.apply({ path: path }, args);
};
