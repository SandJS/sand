var sand = require('../../..');

sand()
  .on('shutdown', function() {
    "use strict";
    process.exit(3);
  }).start().shutdown();

// Keep process alive
setTimeout(function(){}, 10000);