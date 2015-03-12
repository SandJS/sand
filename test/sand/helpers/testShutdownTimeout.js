var sand = require('../../..');
var BadGrain = require('./BadGrain');

new sand({
  shutdownTimeout: 100
}).use(BadGrain, {
  testShutdown: true
}).start().shutdown();