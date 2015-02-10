if (global.SandLogger) {
  exports = module.exports = global.SandLogger;
  return;
}

/**
 * Module Dependencies
 */
var winston = require('winston');
var _ = require('lodash');
var moment = require('moment');

/**
 * Initialize a new `Application`.
 *
 * @api public
 */

function Logger(namespace, showFile) {
  "use strict";

  if (!(this instanceof Logger)) {
    return new Logger(showFile, namespace);
  }

  if(_.isUndefined(showFile)) {
    showFile = false;
  }

  if (typeof namespace === 'undefined') {
    namespace = 'app';
  }

  if (typeof global.SandLog.loggers[namespace] !== 'undefined') {
    return global.SandLog.loggers[namespace];
  }

  this.namespace = namespace;
  this.showFile = showFile;

  Logger.addNamespace(namespace, this);

  setUpLogger();

  this.log = this.log.bind(this);
  this.log.as =
  this.log.ns = function(namespace) {
    return Logger(showFile, namespace).log;
  };

  this.log.Logger = Logger;
}

Logger.prototype.log = function() {
  var args = Array.prototype.slice.call(arguments);
  if (this.showFile) {
    args.unshift('\x1b[30;1m[' + __log_file + ':' + __log_line + ']\x1b[0m');
  }
  args.unshift(this.namespace);

  if (shouldShowLog(this.namespace)) {
    global.SandLog.logger.log.apply(global.SandLog.logger, args);
  }
};

function shouldShowLog(namespace) {
  var split = (process.env.SAND_LOG || '').split(/[\s,]+/);
  var len = split.length;
  var skips = [];
  var names = [];

  var namespaces;
  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] !== '-') {
      names.push((new RegExp('^' + namespaces + '$')));
    } else {
      skips.push((new RegExp('^' + namespaces.substr(1) + '$')));
    }
  }

  for (i = 0, len = skips.length; i < len; i++) {
    if (skips[i].test(namespace)) {
      return false;
    }
  }

  for (i = 0, len = names.length; i < len; i++) {
    if (names[i].test(namespace)) {
      return true;
    }
  }

  return false
}

/**
 * Private Variables
 */
if (_.isUndefined(global.SandLog)) {
  global.SandLog = {
    loggers: {},
    logger: null,
    levels: {},
    colors: {},
    transports: [
      new (winston.transports.Console)({
        colorize: true,
        prettyPrint: true,
        timestamp: function() {
          "use strict";
          return '\x1b[30;1m[' + moment().format('MMM Do h:mm:ss a') + ']\x1b[0m - ' + process.pid;
        }
      })
    ],
    lastIndex: 0,
    firstNamespace: '',
    maxLevel: -1,
    level: 0
  };
}

var colors = [
  'cyan',
  'green',
  'blue',
  'magenta',
  'yellow',
  'red'
];

function setUpLogger() {
  if (!global.SandLog.logger) {
    global.SandLog.logger = new (winston.Logger)({
      transports: global.SandLog.transports,
      levels: global.SandLog.levels,
      colors: global.SandLog.colors
    });
  }

  global.SandLog.logger.setLevels(global.SandLog.levels);
  winston.addColors(global.SandLog.colors);


  global.SandLog.level = global.SandLog.firstNamespace;

  _.each(global.SandLog.transports, function(transport) {
    transport.level = global.SandLog.firstNamespace;
  });
}

Logger.addTransport = function(transport) {
  global.SandLog.transports.push(transport);
  setUpLogger();
};

Logger.addNamespace = function(namespace, logger) {
  global.SandLog.loggers[namespace] = logger;
  global.SandLog.levels[namespace] = ++global.SandLog.maxLevel;
  global.SandLog.colors[namespace] = colors[global.SandLog.lastIndex++ % colors.length];
  if (global.SandLog.firstNamespace == '') {
    global.SandLog.firstNamespace = namespace;
  }
};

/////////////////////////////////////////////////////
////// Register Globals
////////////////////////////////////////////////////

Object.defineProperty(global, '__stack', {
  get: function(){
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack){ return stack; };
    var err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
  }
});

Object.defineProperty(global, '__log_line', {
  get: function(){
    return __stack[2].getLineNumber();
  }
});

Object.defineProperty(global, '__line', {
  get: function(){
    return __stack[1].getLineNumber();
  }
});

Object.defineProperty(global, '__log_function', {
  get: function(){
    return getLastFunctionName(__stack[2].getFunctionName());
  }
});

Object.defineProperty(global, '__function', {
  get: function(){
    return getLastFunctionName(__stack[1].getFunctionName());
  }
});

Object.defineProperty(global, '__file', {
  get: function(){
    return getLastPath(__stack[1].getFileName());
  }
});

Object.defineProperty(global, '__log_file', {
  get: function(){
    return getNamespacePath(__stack[2].getFileName());
  }
});

var path = require('path');
function getLastPath(file) {
  "use strict";
  return path.basename(file);
}

function getNamespacePath(file) {
  return file.replace(sand.appPath, '').replace(/^\//i, '');
}

function getLastFunctionName(name) {
  "use strict";
  return name ? name.split('.').reverse()[0] : '';
}

/**
 * Expose `Application`
 */

global.SandLogger = exports = module.exports = Logger;