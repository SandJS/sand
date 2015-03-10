var Dog = require('./Dog');

var Collie = Dog.extend({
  speak: function() {
    return this.super() + ' and ' + 'I am a Collie';
  },

  doAction: function() {
    return this.eat() + this.super();
  }
});

exports = module.exports = Collie;