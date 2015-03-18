var Logger = require("../../lib/log/Logger");
describe("log", function() {
  it ('should add namespace', function() {
    //global.SandLog.loggers.length.should.equal(0);
    global.SandLog.loggers.should.not.have.property('test');
    var log = new Logger('test').log;
    global.SandLog.loggers.should.have.property('test');
  });

  it ('should return same logger with same namespace', function() {
    var log = Logger('test2');
    log.should.equal(Logger('test2'));
  });

  it ('should add new namespace', function() {
    var log = Logger('test').log;
    var log2 = log.as('test2');
    var log3 = log2.ns('test3');

    log.should.be.a.Function;
    log2.should.be.a.Function;
    log3.should.be.a.Function;
  });
});