var Animal = require('./Animal');

exports = module.exports = Dog;

function Dog(name) {
  this.super(name);
}


Dog.extend(Animal, {
  speak: function() {
    return this.super() + ' and ' + 'I Bark';
  }
});