var Animal = require('./class/Animal');
var Dog = require('./class/Dog');
var Cat = require('./class/Cat');
var Collie = require('./class/Collie');
var _ = require('lodash');

describe('Class Inheritance', function() {
  var dog = new Dog('Terrie');
  var cat = new Cat('Hana');
  var collie = new Collie('Ollie');

  it('Should be Animal', function() {
    dog.should.be.instanceOf(Animal);
    cat.should.be.instanceOf(Animal);
    collie.should.be.instanceOf(Animal);
  });

  it('should call parent methods', function() {
    dog.speak().should.match(/name is.*bark/i);
    cat.speak().should.match(/name is.*meow/i);
    collie.speak().should.match(/name is.*bark.*collie/i);
  });

  it('should call the parent constructor if you don\'t supply one', function() {
    collie.name.should.be.equal('Ollie');
  });

  it('should have the parent static properties/methods', function() {
    Animal.food.should.be.a.String;
    Animal.factory.should.be.a.Function;
    Animal.factory().should.be.instanceOf(Animal);

    Dog.food.should.be.a.String;
    Dog.factory.should.be.a.Function;
    Dog.factory().should.be.instanceOf(Dog);
    Dog.overrideMe().should.match(/please override.*dog/);
  });

  it('should handle super correctly', function() {
    try {
      collie.doAction();
      true.should.be.ok;
    } catch(e) {
      false.should.be.ok;
    }
  });

  it('should inherit outside class properly', function(done) {
    var Emitter = new (require('./class/Emitter'))();
    var name = 'event';
    Emitter.on(name, function() {
      done();
    }).sendEvent(name);
  });

  it('should create new instance if called as function', function() {
    "use strict";
    var dog = Dog();
    dog.speak().should.match(/name is.*bark/i);
  });
});