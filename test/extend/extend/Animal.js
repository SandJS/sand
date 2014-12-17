exports = module.exports = Animal;

function Animal(name) {
  this.name = name || 'No Name';
}

Animal.prototype.speak = function() {
  return 'My name is ' + this.name;
};