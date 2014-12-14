/**
 * Module Dependencies
 */
var winston = require('winston');
var _ = require('lodash');

/**
 * Initialize a new `Application`.
 *
 * @api public
 */

function Logger(namespace) {
  "use strict";
  if (!(this instanceof Logger)) {
    return new Logger(namespace);
  }

  if (typeof namespace === 'undefined') {
    namespace = 'app';
  }

  if (typeof global.SandLog.loggers[namespace] !== 'undefined') {
    return global.SandLog.loggers[namespace];
  }

  this.namespace = namespace;

  Logger.addNamespace(namespace, this);

  setUpLogger();

  this.log = this.log.bind(this);
  this.log.as =
  this.log.ns = function(namespace) {
    return Logger(namespace).log;
  };

  this.log.Logger = Logger;
}

Logger.prototype.log = function() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.namespace);

  if (shouldShowLog(this.namespace)) {
    global.SandLog.logger.log.apply(global.SandLog.logger, args);
  }
};

function shouldShowLog(namespace) {
  var split = (process.env.SAND_LOG || '').split(/[\s,]+/);
  var len = split.length;

  var namespaces;
  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] !== '-') {
      return (new RegExp('^' + namespaces + '$')).test(namespace);
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
        prettyPrint: true
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
  global.SandLog.logger = new (winston.Logger)({
    transports: global.SandLog.transports,
    levels: global.SandLog.levels,
    colors: global.SandLog.colors
  });

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

/**
 * Expose `Application`
 */

exports = module.exports = Logger;
