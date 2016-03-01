'use strict';

var assert = require('assert');
var path = require('path');
var fs = require('fs');

var Unity = require('..');

var rootBinding = require('./bindings/root');

var instance;

describe('unity', function() {
  before(function() {
    instance = new Unity({
      bindings: path.join(__dirname, 'bindings')
    });
  });

  beforeEach(function() {
    rootBinding.setData({
      d: {
        a: 'hello'
      }
    });
  });

  it('should build a hierarchy of resolvers', function() {
    assert.ok(instance.getHierarchy().root);
  });

  it('should resolve an object value from /root/a/1', function(done) {
    instance.get('/root/a/1').then(function(result) {
      assert.ok(result);
      assert.equal(result.id, 1);
      done();
    });
  });

  it('should throw an error on unresolvable path', function(done) {
    try {
      instance.get('/root/zyx').then(function(result) {
        assert.fail('Should not be here');
        done();
      });
    } catch (err) {
      assert.ok(err instanceof Unity.UnresolvablePathError);
      done();
    }
  });

  it('should throw an error on undefined action', function(done) {
    try {
      instance.add('/root/a/1').then(function(result) {
        assert.fail('Should not be here');
        done();
      });
    } catch (err) {
      assert.ok(err instanceof Unity.UndefinedActionError);
      done();
    }
  });

  it('should throw an error on undefined protocol', function(done) {
    try {
      instance.get('buffer:///root/a/1').then(function(result) {
        assert.fail('Should not be here');
        done();
      });
    } catch (err) {
      assert.ok(err instanceof Unity.UndefinedProtocolError);
      done();
    }
  });

  it('should resolve a deferred property value from /root/a/1/value', function(done) {
    instance.get('/root/a/1/value').then(function(result) {
      assert.ok(result);
      assert.equal(result, 'abc');
      done();
    });
  });

  it('should resolve a string value from /root/b/xyz', function(done) {
    instance.get('/root/b/xyz').then(function(result) {
      assert.ok(result);
      assert.equal(result.id, 'xyz');
      done();
    });
  });

  it('should sort by a query value in /root/c?orderBy=id', function(done) {
    instance.get('/root/c?orderBy=id').then(function(result) {
      assert.ok(result);
      var lastR = 0;
      result.forEach(function(r) {
        assert.ok(r.id > lastR, r.id);
        lastR = r.id;
      });
      done();
    });
  });

  it('should sort by a query value in /root/c with query as object', function(done) {
    instance.get('/root/c', {
      query: {
        orderBy: 'id'
      }
    }).then(function(result) {
      assert.ok(result);
      var lastR = 0;
      result.forEach(function(r) {
        assert.ok(r.id > lastR, r.id);
        lastR = r.id;
      });
      done();
    });
  });

  it('should throw an error on illegal query', function(done) {
    try {
      instance.get('/root/c?gargle=gorgle').then(function(result) {
        assert.fail('Should not be here');
        done();
      });
    } catch (err) {
      assert.ok(err instanceof Unity.IllegalQueryError);
      done();
    }
  });

  it('should throw an error on illegal query with query as object', function(done) {
    try {
      instance.get('/root/c', {
        query: {
          gergle: 'gurgle'
        }
      }).then(function(result) {
        assert.fail('Should not be here');
        done();
      });
    } catch (err) {
      assert.ok(err instanceof Unity.IllegalQueryError);
      done();
    }
  });

  it('should copy a value by path', function(done) {
    instance.cpy('/root/d/a', '/root/d/b')
      .then(function(result) {
        assert.equal(result, 'hello');

        return instance.get('/root/d/b');
      }).then(function(result) {
        assert.equal(result, 'hello');
        done();
      });
  });

  it('should move a value by path', function(done) {
    instance.mov('/root/d/a', '/root/d/b')
      .then(function(result) {
        assert.equal(result, true);

        return instance.get('/root/d/b');
      }).then(function(result) {
        assert.equal(result, 'hello');

        return instance.get('/root/d/a');
      }).then(function(result) {
        assert.ok(!result);

        done();
      });
  });

  it('should copy a file as buffer by name', function(done) {
    instance.cpy('buffer:///root/files/emojighost.png', 'buffer:///root/files/test.png')
      .then(function(result) {
        var stat = fs.statSync(__dirname + '/files/test.png');
        assert.ok(stat);
        assert.equal(stat.size, 48999);

        return instance.del('/root/files/test.png');
      }).then(function(result) {
        try {
          var stat = fs.statSync(__dirname + '/files/test.png');
          assert.fail('File should not exist');
        } catch(err) {
          assert.ok(err);
        }

        done();
      }).catch(function(err) {
        done(err);
      });
  });

  it('should copy a file as stream by name', function(done) {
    instance.cpy('stream:///root/files/emojighost.png', 'stream:///root/files/test.png')
      .then(function(result) {
        var stat = fs.statSync(__dirname + '/files/test.png');
        assert.ok(stat);
        assert.equal(stat.size, 48999);

        return instance.del('/root/files/test.png');
      }).then(function(result) {
        try {
          var stat = fs.statSync(__dirname + '/files/test.png');
          assert.fail('File should not exist');
        } catch(err) {
          assert.ok(err);
        }

        done();
      }).catch(function(err) {
        done(err);
      });
  });

  it('should run a path as a function with parameters', function(done) {
    instance.run('/root/function/5', { value: 5}).then(function(result) {
      assert.ok(result);
      assert.equal(result, 10);
      done();
    });
  });

  it('should init bindings using alternate format, test #1', function(done) {
    instance.get('/root/e/f').then(function(result) {
      assert.ok(result);
      assert.equal(result, '123');
      done();
    });
  });

  it('should init bindings using alternate format, test #2', function(done) {
    instance.get('/root/e/g').then(function(result) {
      assert.ok(result);
      assert.equal(result, '321');
      done();
    });
  });
});
