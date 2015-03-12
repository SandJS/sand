var sand = require('../../..');

new sand()
  .on('shutdown', function() {
    "use strict";
    process.exit(4);
  }).start();

// Keep process alive
setTimeout(function(){}, 10000);