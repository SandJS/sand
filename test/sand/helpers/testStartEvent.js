var sand = require('../../..');

new sand()
  .on('start', function() {
    "use strict";
    process.exit(2);
  }).start();

// Keep process alive
setTimeout(function(){}, 10000);