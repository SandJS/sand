"use strict";

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
      }, 500);  // some environments (travis) need some extra time for node-pm to startup
    });
  }

});

describe('Config', function() {
  "use strict";
  it ('should set defaults', function() {
    var app = new sand();
    app.env.should.be.equal('test');
    app.config.initTimeout.should.be.a.Number;
  });

  it ('should use passed in config', function() {
    var app = new sand({
      env: 'mine'
    });

    app.config.env.should.be.equal('mine');
  });

  it('should load from file', function() {
    var app = new sand({
      configPath: path.resolve(__dirname + '/helpers/config.js')
    });

    app.config.env.should.be.equal('mine')
  });

  it('should load log level correctly', function() {
    var app = new sand({
      configPath: path.resolve(__dirname + '/helpers/config.js')
    });

    app.config.log.should.be.eql('unknown');
  });

  it('should load config from environment variable', function () {
    process.env.SAND_CONFIG_PATH = path.resolve(__dirname + '/helpers/config.js');

    var app = new sand();

    delete process.env.SAND_CONFIG_PATH;

    app.config.env.should.be.equal('mine');
  });
});

describe('app.inspect()', function(){
  it('should work', function(){
    var app = new sand();
    var util = require('util');
    util.inspect(app);
  });
});

describe('Context', () => {
  let app = new sand({
    configPath: path.resolve(__dirname + '/helpers/config.js')
  });

  it ('should run in separate context', (done) => {
    app.ctx.test = 1;
    app.ctx.test.should.be.eql(1);

    app.runInContext(() => {
      global.sand.ctx.test = 2;
      global.sand.ctx.test.should.be.eql(2);
      done();
    });

    app.ctx.test.should.be.eql(1);
  });

  it ('should enter and exit new context with autoEnter', () => {
    app.ctx.test = 1;
    app.ctx.test.should.be.eql(1);

    let ctx = app.newContext();
    global.sand.ctx.test = 2;
    global.sand.ctx.test.should.be.eql(2);
    ctx.exit();

    app.ctx.test.should.be.eql(1);
  });

  it ('should enter and exit new context manually', () => {
    app.ctx.test = 1;
    app.ctx.test.should.be.eql(1);

    let ctx = app.newContext(false);
    ctx.enter();
    global.sand.ctx.test = 2;
    global.sand.ctx.test.should.be.eql(2);
    ctx.exit();

    app.ctx.test.should.be.eql(1);
  });

  it ('should enter and exit new Custom context', () => {
    app.ctx.test = 1;
    app.ctx.test.should.be.eql(1);

    let ctx = app.newContext(CustomContext);
    global.sand.ctx.should.be.instanceOf(CustomContext);
    global.sand.ctx.test = 2;
    global.sand.ctx.test.should.be.eql(2);
    ctx.exit();

    app.ctx.test.should.be.eql(1);
  });

  it ('should run in separate context', (done) => {
    app.ctx.test = 1;
    app.ctx.test.should.be.eql(1);

    app.runInContext(CustomContext, (close) => {
      global.sand.ctx.should.be.instanceOf(CustomContext);
      global.sand.ctx.test = 2;
      global.sand.ctx.test.should.be.eql(2);
      setTimeout(() => { close(); done()}, 300);
    });

    app.ctx.test.should.be.eql(1);
  });

  it ('should run in separate context with generator', (done) => {
    global.sand.ctx.test = 1;
    global.sand.ctx.test.should.be.eql(1);

    global.sand.runInContext(function *() {
      global.sand.ctx.test = 2;
      yield new Promise((resolve) => {
        process.nextTick(() => {
          setTimeout(() => {
            global.sand.ctx.test.should.be.eql(2);
            resolve();
            done();
          }, 200);
        });
      });
    });

    global.sand.ctx.test.should.be.eql(1);
  });

  describe('Events', () => {
    it ('should emit exit event', (done) => {
      let ctx = app.newContext(false);
      ctx.on('exit', done);
      ctx.enter();
      ctx.exit();
    });

    it ('should emit enter event', (done) => {
      let ctx = app.newContext(false);
      let c = 0;
      ctx.on('exit', () => { c.should.be.eql(1); done()});
      ctx.on('enter', () => {c++});
      ctx.enter();
      ctx.exit();
    });
  });

});

class CustomContext extends require('../../lib/Context') {

}