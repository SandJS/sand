require('../..').Extend.enableGlobalExtend();

var Animal = require('./extend/Animal');
var Dog = require('./extend/Dog');
var Cat = require('./extend/Cat');

describe('Extend Inheritance', function() {
  var dog = new Dog('Terrie');
  var cat = new Cat('Hana');

  it('Should be Animal', function() {
    dog.should.be.instanceOf(Animal);
    cat.should.be.instanceOf(Animal);
  });

  it('should call parent methods', function() {
    dog.speak().should.match(/name is.*bark/i);
    cat.speak().should.match(/name is.*meow/i);
  })

});