exports = module.exports = require('../../..').Class.extend({
  isSandGrain: true,
  init: function(config, done) {
    "use strict";
    this.config = config;
    this.version = '0.0.1';

    // Just keep process live long enough
    setTimeout(function(){}, 10000);

    if (!config.testInit) {
      done()
    }
  },
  shutdown: function(done) {
    "use strict";
    if (!this.config.testShutdown) {
      done()
    }
  },
  log: function() {
    "use strict";
    // Fake logger
  }
});