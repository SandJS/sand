var sand = require('../../..');
var BadGrain = require('./BadGrain');

sand({
  initTimeout: 100
}).use(BadGrain, {
  testInit: true
}).start();