/**
 * Module Dependencies
 */
var Class = require('./extend/Class');
var Extend = require('./extend/Extend');
var EventEmitter = require('events').EventEmitter;
var only = require('only');
var Logger = require('./log/Logger');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

/**
 * Initialize a new `Application`.
 *
 * @api public
 */
var Application = Class.extend(EventEmitter, {
  construct: function (config) {
    "use strict";
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

    this._boundShutdown = this.shutdown.bind(this, process.exit);

    global.sand = this;
  },
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
  start: function(cb) {
    "use strict";

    this.logStart();

    var initCount = 0;
    var timer = this._waitTimer(this.config.initTimeout, 'Could not start in ' + this.config.initTimeout + ' seconds, shutting down...');
    var self = this;
    this.modules.forEach(function(v) {
      self[v.name] = v.module;
      v.module.log('Version: ' + v.module.version);
      v.module.init(v.config, function() {
        initCount++;
        if (initCount >= self.modules.length) {
          self.emit('start');
          clearTimeout(timer);
          if (_.isFunction(cb)) {
            cb();
          }
        }
      });
    });

    if (!this.modules.length) {
      self.emit('start');
    }

    process.on("exit", this._boundShutdown);
    process.on("SIGINT", this._boundShutdown);
    process.on("SIGTERM", this._boundShutdown);
    process.on('uncaughtException', function(err) {
      this.log(err.stack || err.message || err);
      this._boundShutdown.call(this);
    }.bind(this));

    return this;
  },

  /**
   * Calls shutdown on each module
   */
  shutdown: function shutdown(cb) {
    "use strict";
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    this._log('Shutting down...');
    var shutdownCount = 0;
    var timer = this._waitTimer(this.config.shutdownTimeout, 'Could not shutdown in ' + this.config.shutdownTimeout + ' seconds, hard shutting down...');
    this.modules.forEach(function(v) {
      v.module.shutdown(function() {
        shutdownCount++;
        if (shutdownCount >= this.modules.length) {
          clearTimeout(timer);
          if (_.isFunction(cb)) {
            cb();
          }
        }
      }.bind(this));
    }.bind(this));

    this.emit('shutdown');
  },

  /**
   * Configures sand to use {SandGrain}
   *
   * @param {SandGrain} module the {SandGrain} to load
   * @param {JSON} [config] the config to override
   * @param {string} [name=moduleName] the variable name to use, by default uses module name
   *
   * @returns {Application}
   */
  use: function(module, config, name) {
    if (typeof module === 'function') {
      // Not an instance, lets instantiate it
      module = new module();
    }

    if (!('isSandGrain' in module)) {
      this._log('This module is not an instance of SandGrain. Therefore it is invalid.', JSON.stringify(module));
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
        name: name || module.name,
        config: config,
        module: module
      }
    );

    return this;
  },

  loadConfig: function() {
    "use strict";
    _.defaults(this.config, require('./defaultConfig'));

    var configPath = this.config.configPath || this.appPath + '/config/sand';
    try {
      var config = require(configPath);
      _.defaults(this.config, config);
    } catch(e) {}

    // set other configs
    if (!_.isUndefined(this.config.log) && !process.env.SAND_LOG) {
      process.env.SAND_LOG = this.config.log;
    }
  },

  _waitTimer: function(time, message) {
    "use strict";
    return setTimeout(function() {
      this._log(message);
      process.exit(1);
    }.bind(this), time);
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
exports.Class = Class;
exports.Logger = Logger;