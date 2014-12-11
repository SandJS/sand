/**
 * Module Dependencies
 */

var Extend = require('sand-extend').Extend;
var EventEmitter = require('events').EventEmitter;
var only = require('only');
var Logger = require('sand-log');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

/**
 * Initialize a new `Application`.
 *
 * @api public
 */
function Application(config) {
  "use strict";
  if (!(this instanceof Application)) {
    return new Application(config);
  }

  this.config = _.isObject(config) ? config : {};
  this.appPath = process.env.SAND_APP_PATH || this.config.appPath || path.dirname(require.main.filename);
  this.loadConfig();
  this.env = this.config.env || process.env.NODE_ENV || 'development';
  this._log = (new Logger('Sand')).log;
  this.modules = [];

  try {
    this.log = (new Logger(require(this.appPath + '/package').name)).log;
  } catch(e) {
    this._log(this.appPath + ' is not the correct AppPath');
  }

  // Load package.json
  var p = require('../package.json');
  this.version = p.version;

  global.sand = this;
}

Extend(Application, EventEmitter, {
  /**
   * Converts Sand into a nice
   * descriptive object
   * @returns {*}
   */
  inspect: function toJSON() {
    "use strict";
    return only(this, [
      'env',
      'version',
      'modules'
    ]);
  },

  /**
   * Registers for process exit and initializes
   * each module
   *
   * @returns {Application}
   */
  start: function() {
    "use strict";

    this.logStart();

    this.modules.forEach(function(v) {
      this[v.name] = v.module;
      v.module.init(v.config);
    }.bind(this));

    process.on("exit", this.shutdown.bind(this));
    process.on("SIGINT", this.shutdown.bind(this));
    process.on("SIGTERM", this.shutdown.bind(this));

    this.emit('start');

    return this;
  },

  /**
   * Calls shutdown on each module
   */
  shutdown: function shutdown() {
    "use strict";
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    this._log('Shutting down...');
    this.modules.forEach(function(v) {
      v.module.shutdown();
    }.bind(this));
    this.emit('shutdown');
  },

  /**
   * Configures sand to use {SandGrain}
   *
   * @param {SandGrain} module the {SandGrain} to load
   * @param {JSON} [config] the config to override
   *
   * @returns {Application}
   */
  use: function(module, config) {
    if (typeof module === 'function') {
      // Not an instance, lets instantiate it
      module = new module();
    }

    if (!('isSandGrain' in module)) {
      this.log('This module is not an instance of SandGrain. Therefore it is invalid.', JSON.stringify(module));
      return this;
    }

    if (typeof config === 'undefined') {
      // lets load the config
      var path = this.appPath + '/config/' + module.configName + '.js';
      if (fs.existsSync(path)) {
        config = require(path);
      }
    }

    this.modules.push(
      {
        name: module.name,
        config: config,
        module: module
      }
    );

    return this;
  },

  loadConfig: function() {
    "use strict";
    var configPath = this.config.configPath || this.appPath + '/config/sand';
    try {
      var config = require(configPath);
      _.defaults(this.config, config);
    } catch(e) {}
  },

  /**
   * Logs that sand is starting
   */
  logStart: function() {
    "use strict";
    this._log('   ____             __');
    this._log('  / __/__ ____  ___/ /');
    this._log(' _\\ \\/ _ `/ _ \\/ _  /');
    this._log('/___/\\_,_/_//_/\\_,_/');
    this._log('Version ' + this.version);
  }
});

/**
 * Expose `Application`
 */
exports = module.exports = Application;

// Expose the Extend functionality
exports.Extend = Extend;
exports.Logger = Logger;