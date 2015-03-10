var Animal = require('./Animal');

exports = module.exports = Cat;

function Cat(name) {
  this.super(name);
}


Cat.extend(Animal, {
  speak: function() {
    return this.super() + ' and ' + 'I Meow';
  }
});