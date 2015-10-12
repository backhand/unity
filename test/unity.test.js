var assert = require('assert');
var path = require('path');

var Unity = require('..');

var instance;

describe('unity', function() {
  beforeEach(function() {
    instance = new Unity({
      resolvers: path.join(__dirname, 'resolvers')
    });
  });

  it('should build a hierarchy of resolvers', function() {
    assert.ok(instance.getHierarchy().root);
  });

  it('should resolve an int value from /root/a/1', function() {
    instance.resolvePath('/root/a/1').then(function(result) {
      assert.ok(result);
      assert.equal(result.id, 1);
    });
  });

  it('should resolve a string value from /root/b/xyz', function() {
    instance.resolvePath('/root/b/xyz').then(function(result) {
      assert.ok(result);
      assert.equal(result.id, 'xyz');
    });
  });

  it('should sort by a query value in /root/c', function() {
    instance.resolvePath('/root/c?orderBy=id').then(function(result) {
      assert.ok(result);
      var lastR = 0;
      result.forEach(function(r) {
        assert.ok(r.id > lastR, r.id);
        lastR = r.id;
      });
    });
  });
});
