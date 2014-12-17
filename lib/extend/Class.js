var _ = require('lodash');
var initializing = false;

// The base Class implementation (does nothing)
function Class(){

}

exports = module.exports = Class;

// Create a new Class that inherits from this class
Class.extend = function(constructor, newPrototype, staticPrototype) {

  if (_.isPlainObject(constructor)) {
    staticPrototype = newPrototype;
    newPrototype = constructor;
    constructor = null;
  }

  var _parent = constructor || this; // static handle on the parent function
  var _super = _parent.prototype;

  // Instantiate a base class (but only create the instance,
  // don't run the constructor)
  initializing = true;
  var prototype = new (constructor || this)();
  initializing = false;

  // Copy the properties over onto the new prototype
  for (var name in newPrototype) {
    // Check if we're overwriting an existing function
    if (_.isFunction(newPrototype[name])) {
      prototype[name] = (function(name, fn){
        return function() {
          // Save old super
          var oldSuper = this.super;

          // set new super
          this.super = _super[name];

          // call function
          var res = fn.apply(this, arguments);

          // set old super back
          this.super = oldSuper;

          return res;
        };
      })(name, newPrototype[name])
    } else {
      prototype[name] = newPrototype[name];
    }
  }

  // The dummy class constructor
  function Class() {
    // All construction is actually done in the construct method
    if (!initializing) {
      if (!(this instanceof Class)) {
        var o = Object.create(arguments.callee.prototype);
        arguments.callee.apply(o, arguments);
        return o;
      }

      if (this.construct) {
        this.construct.apply(this, arguments);
      }
    }
  }

  // Populate our constructed prototype object
  Class.prototype = prototype;

  // Enforce the constructor to be what we expect
  Class.prototype.constructor = Class;

  // And make this class extendable
  Class.extend = arguments.callee;

  for (name in _parent) {
    if (name !== 'prototype') {
      Class[name] = _parent[name];
    }
  }

  for (name in staticPrototype) {
    if (_.isFunction(staticPrototype[name]) && _.isFunction(_parent[name])) {
      Class[name] = (function(name, fn){
        return function() {
          // Add a new ._super() method that is the same method
          // but on the super-class
          this.super = _parent[name];

          return fn.apply(this, arguments);
        };
      })(name, staticPrototype[name])
    } else {
      Class[name] = staticPrototype[name];
    }
  }

  return Class;
};