var sand = require('../../..');

new sand()
  .on('shutdown', function() {
    "use strict";
    process.exit(4);
  }).start(function () {
    "use strict";

    if (typeof process.send === 'function') {
      process.send('sand started');
    }

    if (process.argv.indexOf('--log') !== -1) {
      console.log('sand started');
    }
  });

// Keep process alive
setTimeout(function(){}, 10000);