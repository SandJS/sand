var sand = require('../..');
var BadGrain = require('./BadGrain');

sand({
  shutdownTimeout: 100
}).use(BadGrain, {
  testShutdown: true
}).start().shutdown();