var Promise = Promise || require('bluebird');
var _ = require('lodash');

var data = {
  d: {

  }
};


var resolvers = [{
  path: '/root/a/id:int',
  resolver: function(context) {
    var id = context.id;

    return new Promise(function(resolve, reject) {
      resolve({
        id: id,
        value: 'abc'
      });
    });
  }
}, {
  path: '/root/a/id:int/property:string',
  defer: true,
  resolver: function(context) {
    return context.deferred[context.property];
  }
}, {
  path: '/root/b/id:string',
  resolver: function(context) {
    var id = context.id;

    return new Promise(function(resolve, reject) {
      resolve({
        id: id
      });
    });
  }
}, {
  path: '/root/c?orderBy=id',
  resolver: function(context) {
    var id = context.id;

    var data = [{
      id: 9
    }, {
      id: 3
    }, {
      id: 8
    }, {
      id: 4
    }, {
      id: 7
    }, {
      id: 6
    }, {
      id: 5
    }];

    return new Promise(function(resolve, reject) {
      resolve(_.sortBy(data, context.query.orderBy));
    });
  }
}, {
  path: '/root/d/id:string',
  resolver: {
    get: function(context) {
      return new Promise(function(resolve, reject) {
        resolve(data.d[context.id]);
      });
    },
    set: function(context, value) {
      return new Promise(function(resolve, reject) {
        resolve(data.d[context.id] = value);
      });
    },
    del: function(context) {
      return new Promise(function(resolve, reject) {
        delete data.d[context.id];
        resolve(true);
      });
    }
  }
}];
resolvers.setData = function(value) {
  data = value;
};

module.exports = resolvers;
