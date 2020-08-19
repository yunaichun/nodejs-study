
/**
 * Expose `Delegator`.
 */

module.exports = Delegator;

/**
 * Initialize a delegator.
 *
 * @param {Object} proto
 * @param {String} target
 * @api public
 */
/* Delegator 构造函数 */
function Delegator(proto, target) {
  /* 必须 new 实例化出来 */
  if (!(this instanceof Delegator)) return new Delegator(proto, target);
  /* 保存传入的参数 */
  this.proto = proto;
  this.target = target;
  /* 定义数组 */
  this.methods = [];
  this.getters = [];
  this.setters = [];
  this.fluents = [];
}

/**
 * Automatically delegate properties
 * from a target prototype
 *
 * @param {Object} proto
 * @param {object} targetProto
 * @param {String} targetProp
 * @api public
 */
Delegator.auto = function(proto, targetProto, targetProp){
  var delegator = Delegator(proto, targetProp);
  var properties = Object.getOwnPropertyNames(targetProto);
  for (var i = 0; i < properties.length; i++) {
    var property = properties[i];
    var descriptor = Object.getOwnPropertyDescriptor(targetProto, property);
    if (descriptor.get) {
      delegator.getter(property);
    }
    if (descriptor.set) {
      delegator.setter(property);
    }
    if (descriptor.hasOwnProperty('value')) { // could be undefined but writable
      var value = descriptor.value;
      if (value instanceof Function) {
        delegator.method(property);
      } else {
        delegator.getter(property);
      }
      if (descriptor.writable) {
        delegator.setter(property);
      }
    }
  }
};

/**
 * Delegate method `name`.
 *
 * @param {String} name
 * @return {Delegator} self
 * @api public
 */
Delegator.prototype.method = function(name){
  var proto = this.proto;
  var target = this.target;
  /* 保存方法名 */
  this.methods.push(name);

  /* proto 对象上挂载 name 方法，实际是调用 */
  proto[name] = function(){
    /* 调用的是具体目标的方法 
      this.context = this.request[name]
      this.context = this.response[name]
    */
    return this[target][name].apply(this[target], arguments);
  };

  return this;
};

/**
 * Delegator accessor `name`.
 *
 * @param {String} name
 * @return {Delegator} self
 * @api public
 */
Delegator.prototype.access = function(name){
  /* 可读可写属性 */
  return this.getter(name).setter(name);
};

/**
 * Delegator getter `name`.
 *
 * @param {String} name
 * @return {Delegator} self
 * @api public
 */
Delegator.prototype.getter = function(name){
  var proto = this.proto;
  var target = this.target;
  this.getters.push(name);

  /* 在已存在的对象上添加可读属性，其中第一个参数为属性名，第二个参数为函数，返回值为对应的属性值 */
  proto.__defineGetter__(name, function(){
    /* 返回的是 target 上的 name 属性 */
    return this[target][name];
  });

  return this;
};

/**
 * Delegator setter `name`.
 *
 * @param {String} name
 * @return {Delegator} self
 * @api public
 */
Delegator.prototype.setter = function(name){
  var proto = this.proto;
  var target = this.target;
  this.setters.push(name);

  /* 在已存在的对象上添加可读属性，其中第一个参数为属性名，第二个参数为函数，参数为传入的值 */
  proto.__defineSetter__(name, function(val){
    return this[target][name] = val;
  });

  return this;
};

/**
 * Delegator fluent accessor
 *
 * @param {String} name
 * @return {Delegator} self
 * @api public
 */
Delegator.prototype.fluent = function (name) {
  var proto = this.proto;
  var target = this.target;
  this.fluents.push(name);

  proto[name] = function(val){
    if ('undefined' != typeof val) {
      this[target][name] = val;
      return this;
    } else {
      return this[target][name];
    }
  };

  return this;
};
