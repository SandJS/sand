"use strict";

// Bad Grains don't have an init or shutdown
class BadGrain {

  //init(config, done) {
  //  "use strict";
  //  this.config = config;
  //  this.version = '0.0.1';
  //
  //  // Just keep process live long enough
  //  setTimeout(function(){}, 10000);
  //
  //  if (!config.testInit) {
  //    done()
  //  }
  //}
  //  shutdown(done) {
  //  "use strict";
  //  if (!this.config.testShutdown) {
  //    done()
  //  }
  //}

  log() {
    "use strict";
    // Fake logger
  }
}

module.exports = BadGrain;