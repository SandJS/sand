/**
 * @author Kevin Smithson <ksmithson@pocketly.com>
 * @copyright Pocketly 2014
 */

var _ = require('lodash');

function Extend(child, parent, methods) {

  if (!_.isObject(methods)) {
    methods = {};
  }

  var newPrototype = {};
  _.extend(newPrototype, child.prototype, methods);

  child.prototype = Object.create(parent.prototype, {
    constructor: {
      value: child,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });

  // Add the parent as super but
  // this only works one level up
  // after that we get an infinite loop
  child.prototype.super = parent;

  // Added for DuckTyping across node modules
  child.prototype['is' + parent.name] = true;

  // Handle instance properties and methods
  for (var key in newPrototype) {
    if (newPrototype.hasOwnProperty(key)) {
      if (parent.prototype[key] && _.isFunction(child.prototype[key])) {
        child.prototype[key] = (function(key, fn) {
          return function() {
            this.super = parent.prototype[key];
            return fn.apply(this, arguments);
          };
        })(key, newPrototype[key])
      } else {
        child.prototype[key] = newPrototype[key];
      }
    }
  }


  // Handle static properties and methods
  for (key in parent) {
    if (parent.hasOwnProperty(key)) {
      if (_.isFunction(child[key])) {
        child[key] = (function (key, fn) {
          return function () {
            this.super = parent[key];
            return fn.apply(this, arguments);
          };
        })(key, parent[key])
      } else {
        child[key] = parent[key];
      }
    }
  }
}

exports = module.exports = Extend;

/**
 * Add a Global .extend to the Function
 * prototype, enables you tall call extend
 * on a function
 */
exports.enableGlobalExtend = function() {
  Object.defineProperty(Function.prototype, 'extend', {
    value: function(parent, methods) {
      Extend(this, parent, methods);
    },

    configurable: true
  });
};

/**
 * Removes the Function prototype .extend
 */
exports.disableGlobalExtend = function() {
  delete Function.prototype.extend;
};