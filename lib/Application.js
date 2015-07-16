"use strict";

/**
 * Module Dependencies
 */
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
class Application extends EventEmitter {
  constructor(config) {
    super();

    this.config = 'object' === typeof config ? config : {};
    this.env = this.config.env || process.env.NODE_ENV || 'development';
    var appPath = process.env.SAND_APP_PATH || this.config.appPath || path.dirname(require.main.filename);
    this.appPath = fs.realpathSync(appPath);
    this.loadConfig();
    this._log = (new Logger('Sand')).log;
    this.modules = [];

    try {
      this.appName = require(this.appPath + '/package').name;
      let logger = (new Logger(this.appName, true));
      this.log = logger.log;
      this.warn = logger.warn;
      this.error = logger.error;
    } catch(e) {
      this._log(this.appPath + ' is not the correct AppPath');
    }

    // Set PS Title
    this.executable = path.basename(process.argv[0]);
    process.title = `${this.executable} ${this.appName}`;

    // Load package.json
    var p = require('../package.json');
    this.version = p.version;

    this._boundShutdown = this.shutdown.bind(this, process.exit);

    global.sand = this;
  }

  /**
   * Converts Sand into a nice
   * descriptive object
   * @returns {*}
   */
  inspect() {
    return only(this, [
      'env',
      'version',
      'modules'
    ]);
  }

  /**
   * Registers for process exit and initializes
   * each module
   *
   * @returns {Application}
   */
  start(cb) {
    this.logStart();

    var initCount = 0;
    var timer = this._waitTimer(this.config.initTimeout, 'Could not start in ' + this.config.initTimeout + ' milliseconds, shutting down...');
    var self = this;
    this.modules.forEach(function(v) {
      v.module.init(v.config, function() {
        initCount++;
        if (initCount >= self.modules.length) {
          self.emit('start');
          clearTimeout(timer);
          if ('function' === typeof cb) {
            cb();
          }
        }
      });

      v.module.log('Version: ' + v.module.version);
    });

    if (!this.modules.length) {
      self.emit('start');
      if ('function' === typeof cb) {
        cb();
      }
    }

    // Listens
    process.on('message', function(msg) {
      if ('shutdown' == msg) {
        self._boundShutdown();
      }
    });

    process.on("exit", this._boundShutdown);
    process.on("SIGINT", this._boundShutdown);
    process.on("SIGTERM", this._boundShutdown);
    process.on("uncaughtException", function(err) {
      self._log(err.stack || err.message || err);
      self._boundShutdown();
    });

    return this;
  }

  /**
   * Calls shutdown on each module
   */
  shutdown(cb) {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    this._log('Shutting down...');
    var shutdownCount = 0;
    var timer = this._waitTimer(this.config.shutdownTimeout, 'Could not shutdown in ' + this.config.shutdownTimeout + ' milliseconds, hard shutting down...');
    this.modules.forEach(function(v) {
      v.module.shutdown(function() {
        shutdownCount++;
        if (shutdownCount >= this.modules.length) {
          clearTimeout(timer);
          if ('function' === typeof cb) {
            cb();
          }
        }
      }.bind(this));
    }.bind(this));

    this.emit('shutdown');
  }

  /**
   * Configures sand to use {SandGrain}
   *
   * @param {SandGrain} module the {SandGrain} to load
   * @param {JSON} [config] the config to override
   * @param {string} [name=moduleName] the variable name to use, by default uses module name
   *
   * @returns {Application}
   */
  use(module, config, name) {
    if (typeof module === 'function') {
      // Not an instance, lets instantiate it
      module = new module();
    }

    if ('function' !== typeof module.shutdown && 'function' !== typeof module.init) {
      this._log(`${module.name} module is not an instance of SandGrain. Therefore it is invalid.`, JSON.stringify(module));
      return this;
    }

    if (typeof config === 'undefined') {
      // lets load the config
      var path = this.appPath + '/config/' + module.configName + '.js';
      if (fs.existsSync(path)) {
        config = require(path);
      } else {
        // Lets set an empty config
        config = {
          all: {}
        };
      }
    }

    var obj = {
      name: name || module.name,
      config: config,
      module: module
    };

    this.modules.push(obj);
    this[obj.name] = obj.module;

    return this;
  }

  loadConfig() {
    var configPath = this.config.configPath || this.appPath + '/config/sand';
    var config = {};
    try {
      _.merge(config, this.getConfig(require(configPath)), this.config);
    } catch(e) {
      // Set defaults
      _.merge(config, require("./defaultConfig"), this.config);
    }

    this.config = config;

    // set other configs
    if (!_.isUndefined(this.config.log) && !process.env.SAND_LOG) {
      process.env.SAND_LOG = this.config.log;
    }
  }

  getConfig(config) {
    var env = config[this.env] || {};
    var all = config['all'] || {};
    var defaults = require('./defaultConfig');

    return _.merge(defaults, all, env);
  }

  _waitTimer(time, message) {
    return setTimeout(function() {
      this._log(message);
      process.exit(1);
    }.bind(this), time);
  }

  /**
   * Logs that sand is starting
   */
  logStart() {
    "use strict";
    this._log('   ____             __');
    this._log('  / __/__ ____  ___/ /');
    this._log(' _\\ \\/ _ `/ _ \\/ _  /');
    this._log('/___/\\_,_/_//_/\\_,_/');
    this._log('Version ' + this.version + ' -- ' + this.env);
    this._log(`Running on ${this.executable} ${process.version} - ${process.platform} - ${process.arch}`);
    this._log('Project: ' + this.appName)
  }
}

/**
 * Expose `Application`
 */
module.exports = exports = Application;
exports.Logger = Logger;