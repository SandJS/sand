var sand = require('../../..');
var BadGrain = require('./BadGrain');

new sand({
  initTimeout: 100
}).use(BadGrain, {
  testInit: true
}).start();