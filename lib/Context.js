"use strict";

var _ = require('lodash');
const EventEmitter = require('events').EventEmitter;
const domain = require('domain');
const Util = require('./Util');
const co = require('co');
const coBind = require('co-bind');

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

    this.domain.on('error', (err) => {
      sand.error(err);
    });
  }

  bindModules() {
    // lets bind context to sand grains
    if (sand && sand.modules && sand.modules.length > 0) {
      sand.modules.forEach(function(m) {
        if (typeof sand[m.name] !== 'undefined') {
          if (typeof sand[m.name].bindToContext === 'function') {
            sand[m.name].bindToContext(this);
          }

          if (typeof sand[m.name].onContextEnd === 'function') {
            this.on('exit', function() {
              sand[m.name].onContextEnd(this);
            }.bind(this))
          }
        }
      }.bind(this))
    }
  }

  /**
   * Run the passed in function in a new context
   *
   * @param {Function} fn
   */
  run(fn) {
    this.enter();

    if (Util.isGeneratorFunction(fn)) {
      // Exit the domain after generator finishes
      co(coBind(fn, this)).then(() => {
        this.exit();
      });
    } else {
      // pass in a done function
      let pm = fn.call(this, () => {
        this.exit();
      });

      // check if promise was returned and exit when done
      if (pm instanceof Promise) {
        pm.then(() => {
          this.exit();
        });
      }
    }

    this.domain.exit();

    return this;
  }

  /**
   * Enter the context
   */
  enter() {
    this.domain.enter();
    sand.ctx = this;
    this.bindModules();
    this.emit('enter');

    return this;
  }

  /**
   * Exit the Context
   */
  exit() {
    this.emit('exit');
    this.emit('end'); // for backwards compatibility
    this.domain.exit();

    return this;
  }
}

module.exports = Context;