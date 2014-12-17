exports = module.exports = require('../../').Class.extend({
  isSandGrain: true,
  init: function(config, done) {
    "use strict";
    this.config = config;

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
  }
});