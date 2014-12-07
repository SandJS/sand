var sand = require('..');

describe('app.inspect()', function(){
  it('should work', function(){
    var app = sand();
    var util = require('util');
    util.inspect(app);
  });
});