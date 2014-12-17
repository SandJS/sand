var sand = require('..');
var path = require('path');
var BadGrain = require('./helpers/BadGrain');
var child = require('child_process');

process.env.SAND_APP_PATH = path.resolve(__dirname + '/../');

describe('Events', function() {
  "use strict";
  it ('should emit start event', function(done) {
    sand().on('start', done).start();
  });

  it ('should emit shutdown event', function(done) {
    var app = sand().on('shutdown', done).start();
    app.shutdown();
  });
});

describe('Application', function() {
  "use strict";
  it('should kill init after bad module', function(done) {
    child.fork('test/helpers/testInitTimeout')
      .on('exit', function(code) {
        code.should.be.eql(1);
        done();
      });
  });

  it('should kill shutdown after timeout', function(done) {
    child.fork('test/helpers/testShutdownTimeout')
      .on('exit', function(code) {
        code.should.be.eql(1);
        done();
      });
  });
});

describe('Config', function() {
  "use strict";
  it ('should set defaults', function() {
    sand().env.should.be.equal('test');
  });

  it ('should use passed in config', function() {
    var app = sand({
      env: 'mine'
    });

    app.env.should.be.equal('mine');
  });

  it('should load from file', function() {
    var app = sand({
      configPath: path.resolve(__dirname + '/helpers/config.js')
    });

    app.env.should.be.equal('mine')
  });
});

describe('app.inspect()', function(){
  it('should work', function(){
    var app = sand();
    var util = require('util');
    util.inspect(app);
  });
});