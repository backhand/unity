var assert = require('assert');
var path = require('path');
var util = require('util');

var Resolver = require('../lib/resolver');

describe('resolver', function() {
  it('should init a get-only, single protocol resolver', function(done) {
    var rs = new Resolver(null, function(context) {
      return new Promise(function(resolve, reject) {
        resolve(context.a + 1);
      });
    });

    rs.resolve('get', null, {
      a: 1
    }).then(function(result) {
      assert.equal(result, 2);
      done();
    });
  });

  it('should throw an error if using an undefined action', function(done) {
    var rs = new Resolver(null, function(context) {
      return new Promise(function(resolve, reject) {
        resolve(context.a + 1);
      });
    });

    try {
      rs.resolve('undefined').then(function(result) {
        assert.fail('Should not get here');
        done();
      });
    } catch (err) {
      assert.ok(err instanceof Resolver.UndefinedActionError);
      done();
    }
  });

  it('should init a multi-action, single protocol resolver', function(done) {
    var data = {
      a: 1
    };
    var rs = new Resolver(null, {
      get: function(context) {
        return new Promise(function(resolve, reject) {
          resolve(data.a);
        });
      },
      set: function(context, value) {
        return new Promise(function(resolve, reject) {
          resolve(data.a = value);
        });
      }
    });

    rs.resolve('get').then(function(result) {
      assert.equal(result, data.a);
      return rs.resolve('set', null, null, 2);
    }).then(function(result) {
      assert.equal(result, 2);
      assert.equal(data.a, 2);
      done();
    }).catch(function(err) {
      done(err);
    });
  });

  it('should init a multi-action, multi-protocol resolver', function(done) {
    var data = {
      a: 1
    };
    var rs = new Resolver(null, {
      get: {
        data: function(context) {
          return new Promise(function(resolve, reject) {
            resolve(data.a);
          });
        },
        buffer: function(context) {
          return new Promise(function(resolve, reject) {
            var b = new Buffer(4);
            b.writeInt8(0x1, 0);
            resolve(b);
          });
        }
      },
      set: {
        data: function(context, value) {
          return new Promise(function(resolve, reject) {
            resolve(data.a = value);
          });
        },
        buffer: function(context, value) {
          return new Promise(function(resolve, reject) {
            var intValue = value.readInt8(0);
            resolve(data.a = intValue);
          });
        }
      }
    });

    rs.resolve('get').then(function(result) {
      assert.equal(result, data.a);

      return rs.resolve('set', null, null, 2);
    }).then(function(result) {
      assert.equal(result, 2);
      assert.equal(data.a, 2);

      return rs.resolve('get', 'buffer');
    }).then(function(result) {
      assert.ok(result);
      var intValue = result.readInt8(0);
      assert.ok(intValue, 2);

      var b = new Buffer(4);
      b.writeInt8(0x3, 0);
      return rs.resolve('set', 'buffer', null, b);
    }).then(function(result) {
      assert.ok(result, 3);
      assert.ok(data.a, 3);
      done();
    }).catch(function(err) {
      done(err);
    });
  });
});
