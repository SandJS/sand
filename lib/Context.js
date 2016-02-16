"use strict";

var _ = require('lodash');
const EventEmitter = require('events').EventEmitter;
const domain = require('domain');

/**
 * Context is your main class.
 * In an `action` and `before` context
 * will be your `this`.  Anything your attach
 * to context will be passed along. Plus context
 * adds a lot of nice conveniences.
 */
class Context extends EventEmitter {
  constructor() {
    super();

    this.domain = domain.create();

    // lets bind context to sand grains
    if (sand && sand.modules && sand.modules.length > 0) {
      sand.modules.forEach(function(m) {
        if (typeof sand[m.name] !== 'undefined') {
          if (typeof sand[m.name].bindToContext === 'function') {
            sand[m.name].bindToContext(this);
          }

          if (typeof sand[m.name].onContextEnd === 'function') {
            this.on('end', function() {
              sand[m.name].onContextEnd(this);
            }.bind(this))
          }
        }
      }.bind(this))
    }

    this.domain.on('error', (err) => {
      this.emit('error', err);
    });
  }

  /**
   * Run the passed in function in a new context
   *
   * @param {Function} fn
   */
  run(fn) {
    this.domain.run(() => {
      sand.ctx = this;
      fn();
    });
  }

  /**
   * Enter the context
   */
  enter() {
    this.domain.enter();
    sand.ctx = this;
    this.emit('enter');
  }

  /**
   * Exit the Context
   */
  exit() {
    this.domain.exit();
    this.emit('exit');
  }
}

module.exports = Context;