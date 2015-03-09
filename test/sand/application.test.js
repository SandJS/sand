var sand = require('../../');
var path = require('path');
var child = require('child_process');

process.env.SAND_APP_PATH = path.resolve(__dirname + '/../');

describe('Events', function() {
  "use strict";
  it ('should emit start event', function(done) {
    child.fork('test/sand/helpers/testStartEvent')
      .on('exit', function(code) {
        code.should.be.eql(2);
        done();
      });
  });

  it ('should emit shutdown event', function(done) {
    child.fork('test/sand/helpers/testShutdownEvent')
      .on('exit', function(code) {
        code.should.be.eql(3);
        done();
      });
  });
});

describe('Application', function() {
  "use strict";
  it('should kill init after bad module', function(done) {
    child.fork('test/sand/helpers/testInitTimeout')
      .on('exit', function(code) {
        code.should.be.eql(1);
        done();
      });
  });

  it('should kill shutdown after timeout', function(done) {
    child.fork('test/sand/helpers/testShutdownTimeout')
      .on('exit', function(code) {
        code.should.be.eql(1);
        done();
      });
  });

  it ('should listen to shutdown event', function(done) {
    let c = child.fork('test/sand/helpers/testSignalEvents')
      .on('exit', function(code) {
        code.should.be.eql(4);
        done();
      });

    c.send('shutdown');
  });

  let signals = ['SIGTERM', 'SIGINT'];

  for (let signal of signals) {
    it(`should listen to ${signal} event`, function (done) {
      let c = child.fork('test/sand/helpers/testSignalEvents')
        .on('exit', function (code, signal) {
          code.should.be.eql(4);
          done();
        });

      // Make sure sand started and bound to event
      setTimeout(function () {
        c.kill(signal);
      }, 200);
    });
  }

  for (let signal of signals) {
    it(`should listen to ${signal} events from node-pm`, function (done) {
      let c = child.spawn(path.normalize(__dirname + '/../../node_modules/node-pm/bin/node-pm'), [path.normalize(__dirname + '/helpers/testSignalEvents.js')])
        .on('exit', function (code, signal) {
          code.should.be.eql(0);
          done();
        });

      // Make sure sand started and bound to event
      setTimeout(function () {
        c.kill(signal);
      }, 200);
    });
  }

});

describe('Config', function() {
  "use strict";
  it ('should set defaults', function() {
    var app = sand();
    app.env.should.be.equal('test');
    app.config.initTimeout.should.be.a.Number;
  });

  it ('should use passed in config', function() {
    var app = sand({
      env: 'mine'
    });

    app.config.env.should.be.equal('mine');
  });

  it('should load from file', function() {
    var app = sand({
      configPath: path.resolve(__dirname + '/helpers/config.js')
    });

    app.config.env.should.be.equal('mine')
  });

  it('should load log level correctly', function() {
    var app = sand({
      configPath: path.resolve(__dirname + '/helpers/config.js')
    });

    app.config.log.should.be.eql('unknown');
  });
});

describe('app.inspect()', function(){
  it('should work', function(){
    var app = sand();
    var util = require('util');
    util.inspect(app);
  });
});