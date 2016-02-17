module.exports = Util = {
  /**
   * Check if `obj` is a generator function.
   *
   * @param {Object} obj
   * @return {Boolean}
   * @api private
   */
  isGeneratorFunction: function(obj) {
    var constructor = obj.constructor;
    if (!constructor) return false;
    if ('GeneratorFunction' === constructor.name || 'GeneratorFunction' === constructor.displayName) return true;
    return Util.isGenerator(constructor.prototype);
  },

  isGenerator: function(obj) {
    return 'function' == typeof obj.next && 'function' == typeof obj.throw;
  }
};