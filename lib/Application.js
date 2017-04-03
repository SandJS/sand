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
var co = require('co');
const Context = require('./Context');
const Util = require('./Util');

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
    this.configPath = this.appPath + '/config';   // location for config packaged with the app
    this.extConfigPath = this.config.configPath || process.env.SAND_CONFIG_PATH || this.configPath;   // location for config external to the app
    this.loadConfig();
    this.modules = [];

    let slogger = (new Logger('Sand'));
    this._log = slogger.log;
    this._error = slogger.error;
    this._warn = slogger.warn;

    this.initCalled = false;
    this.initCallback = null;

    try {
      let name = this.config.name;

      if (!name) {
        let packagePaths = process.env.SAND_PACKAGE_PATH ? [process.env.SAND_PACKAGE_PATH] : [this.appPath + '/package.json', process.cwd() + '/package.json'];
        for (let p of packagePaths) {
          if (fs.existsSync(p)) {
            name = require(p).name;
            break;
          }
        }
      }

      this.appName = name || 'sand';
    } catch(e) {
      this.appName = 'sand';
    }

    let logger = (new Logger(this.appName, true));
    this.log = logger.log;
    this.warn = logger.warn;
    this.error = logger.error;
    Logger.setupDebug(this);

    // Set PS Title
    this.executable = path.basename(process.argv[0]);
    process.title = `${this.executable} ${this.appName}`;

    // Load package.json
    var p = require('../package.json');
    this.version = p.version;

    // this._boundShutdown = this.shutdown.bind(this);
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

    let self = this;
    co(function *() {
      yield runFunctionOnModules.call(self, self.modules, 'init', function (module) {
        return [module.config];
      }, function(module) {
        module.module.log('Version: ' + module.module.version);
      }, self.initCallback);

      yield runFunctionOnModules.call(self, self.modules, 'start', null, null, cb);

      // Lets overwrite all debugs
      Logger.overwriteDebug(self);
    }).catch(function(e) {
      self._error(e);
      self._boundShutdown();
    });


    // Listens
    process.on('message', function(msg) {
      if ('shutdown' === msg) {
        self._boundShutdown();
      }
    });

    process.on("exit", this._boundShutdown);
    process.on("SIGINT", this._boundShutdown);
    process.on("SIGTERM", this._boundShutdown);
    process.on("uncaughtException", function(err) {
      self._error(err.stack || err.message || err);
      self._boundShutdown();
    });

    return this;
  }

  /**
   * Calls init on each module then calls
   * your callback, can be a generator or regular function
   *
   * @param {GeneratorFunction|Function} cb
   */
  init(cb) {
    this.initCalled = true;
    this.initCallback = cb;

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
    this.emit('shutdown');

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

    if (!this.modules.length) {
      if ('function' === typeof cb) {
        cb();
      }
    }
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
      module = new module(name);
    }

    if ('function' !== typeof module.shutdown && 'function' !== typeof module.init) {
      this._log(`${module.name} module is not an instance of SandGrain. Therefore it is invalid.`, JSON.stringify(module));
      this.shutdown(process.exit.bind(null, 1));
      return this;
    }

    var appConfig = {};
    var extConfig = {};

    if (typeof config === 'undefined') {
      config = {
        all: {}
      };
    }

    // lets load the app config
    var path = this.configPath + '/' + module.configName + '.js';
    if (fs.existsSync(path)) {
      appConfig = require(path);
    }

    if (this.extConfigPath) {
      // lets load the external config
      var extPath = this.extConfigPath + '/' + module.configName + '.js';
      if (fs.existsSync(extPath)) {
        extConfig = require(extPath);
      }
    }

    var obj = {
      name: name || module.name,
      config: _.merge({}, appConfig, extConfig, config),
      module: module
    };

    this.modules.push(obj);
    this[obj.name] = obj.module;

    return this;
  }

  loadConfig() {
    if (this.extConfigPath === this.configPath) {
      this.extConfigPath = undefined;
    }

    var config = {};
    var appConfig = {};
    var extConfig = {};

    try {
      // get config packaged with the app
      _.merge(appConfig, this.getConfig(require(this.configPath + '/sand')));
    } catch(e) {
      // app config not found
    }

    if (this.extConfigPath) {
      try {
        var extConfigIsDir = fs.lstatSync(this.extConfigPath).isDirectory();
      } catch (e) {
        // we know it's not a directory (it may not exist at all, but that will be handled below)
        extConfigIsDir = false;
      }

      try {
        // get config from a location external to the app
        _.merge(extConfig, this.getConfig(require(this.extConfigPath + (extConfigIsDir ? '/sand' : ''))));
      } catch(e) {
        // external config not found
      }

      if (!extConfigIsDir) {
        // no longer any need for this external config setting
        this.extConfigPath = undefined;
      }
    }

    if (_.isEmpty(appConfig) && _.isEmpty(extConfig)) {
      // no config found, load default config
      _.merge(config, require("./defaultConfig"), this.config);
    } else {
      _.merge(config, appConfig, extConfig, this.config);
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

  /**
   * Get the current context for request
   * or global for cli scripts
   *
   * @returns {*}
   */
  get context() {
    if (process.domain) {
      if (!process.domain.context) {
        return null;
      }

      return process.domain.context;
    }

    // If we are not in a context
    // then we will return a global
    // context on sand

    if (!this._context) {
      this._context = {};
      this._context.bind = fn => fn;
    }

    return this._context;
  }

  /**
   * Shortcut for sand.context
   *
   * @returns {*}
   */
  get ctx() {
    return this.context;
  }

  /**
   * Set the request context or one
   * globally if not in request
   *
   * @param ctx
   */
  set context(ctx) {
    if (process.domain) {
      if (process.domain.context) {
        throw new Error('Context may only be set once per request');
      }

      process.domain.context = ctx;
      ctx.bind = process.domain.bind.bind(process.domain);
    } else {
      if (this._context) {
        throw new Error('Context may only be set once');
      }

      this._context = ctx;
      ctx.bind = fn => fn;
    }
  }

  /**
   * Shortcut for setting this.context
   *
   * @param ctx
   */
  set ctx(ctx) {
    this.context = ctx;
  }

  /**
   * Run Function in its own context
   *
   * @param {Context} [ctx=Context] - Context to run, defaults to Context if not passed
   * @param {Function} fn - the function to call in a new context
   * @param {Boolean} [returnContext=false] - if set to true, then return context instead of promise
   *
   * @returns {Promise|Context}
   */
  runInContext(ctx, fn, returnContext = false) {
    if (fn === void 0) {
      fn = ctx;
      ctx = Context;
    }

    ctx = this.newContext(ctx, false);

    if (returnContext) {
      return ctx.run(fn);
    }

    return new Promise((resolve) => {
      ctx.on('exit', resolve);
      return ctx.run(fn);
    });
  }

  /**
   * Create a new Context
   *
   * @param {Context} [ctx=Context] - the context to use, defaults to Context
   * @param {boolean} [autoEnter=true] - should we auto enter this context?
   *
   * @returns {Context}
   */
  newContext(ctx, autoEnter) {
    if (_.isBoolean(ctx)) {
      autoEnter = ctx;
      ctx = null;
    } else if (autoEnter == void 0) {
      autoEnter = true;
    }

    if (!ctx) {
      ctx = Context;
    }

    ctx = new ctx();

    if (autoEnter) {
      ctx.enter();
    }

    return ctx;
  }
}

/**
 * Expose `Application`
 */
module.exports = exports = Application;
exports.Logger = Logger;
exports.Context = Context;
global.Sand = exports;

//////////////////////////////////////////////////////////
//////////////////// Private Methods /////////////////////
//////////////////////////////////////////////////////////

/**
 * Call your callback or yields your generator
 *
 * @param {GeneratorFunction|Function} cb
 */
function callCallbackOrGenerator(cb) {
  if (Util.isGeneratorFunction(cb)) {
    return co.call(co, cb);
  } else {
    cb();
    return Promise.resolve();
  }
}

/**
 *
 */
function runFunctionOnModules(modules, fnName, args, moduleFunction, doneFunction) {
  var initCount = 0;
  var timer = this._waitTimer(this.config.initTimeout, 'Could not ' + fnName + ' in ' + this.config.initTimeout + ' milliseconds, shutting down...');
  var self = this;

  return new Promise(function(resolve, reject) {
    if (!modules.length) {
      co(function *() {
        yield areWeDone();
      }).catch(self._error);

      return;
    }

    modules.forEach(function (module) {
      co(function *() {
      if ('function' === typeof module.module[fnName]) {
        let a = 'function' === typeof args ? args(module) : [];
        let fn = module.module[fnName].bind(module.module);
        if (Util.isGeneratorFunction(fn)) {

            yield fn.apply(fn, a);
            initCount++;

            if ('function' === typeof moduleFunction) {
              moduleFunction(module);
            }

            yield areWeDone();

        } else {
          a.push(function () {
            initCount++;
            co(function *() {
              yield areWeDone();
            }).catch(self._error);

            if ('function' === typeof moduleFunction) {
              moduleFunction(module);
            }
          });
          fn.apply(fn, a);
        }
      } else {
        initCount++;
        yield areWeDone();
      }
      }).catch(self._error);
    });

    function *areWeDone() {
      if (initCount >= modules.length) {
        self.emit(fnName);
        clearTimeout(timer);
        if ('function' === typeof doneFunction) {
          yield callCallbackOrGenerator.call(null, doneFunction);
        }

        resolve();
      }
    }

    if (!self.modules.length) {
      self.emit(fnName);
      if ('function' === typeof doneFunction) {
        callCallbackOrGenerator.call(module.module, doneFunction);
        resolve();
      }
    }
  });
}