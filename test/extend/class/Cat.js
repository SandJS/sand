var Animal = require('./Animal');

var Cat = Animal.extend({
  construct: function(name) {
    this.super(name);
  },

  speak: function() {
    return this.super() + ' and ' + 'I Meow';
  }
});

exports = module.exports = Cat;
