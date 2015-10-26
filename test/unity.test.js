var assert = require('assert');
var path = require('path');

var Unity = require('..');

var rootResolver = require('./resolvers/root');

var instance;

describe('unity', function() {
  before(function() {
    instance = new Unity({
      resolvers: path.join(__dirname, 'resolvers')
    });
  });

  beforeEach(function() {
    rootResolver.setData({
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
});
