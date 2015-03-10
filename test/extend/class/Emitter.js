var Class = require('../../..').Class;
var EventEmitter = require('events').EventEmitter;

exports = module.exports =
Class.extend(EventEmitter, {
  sendEvent: function(name) {
    this.emit(name);
  }
});