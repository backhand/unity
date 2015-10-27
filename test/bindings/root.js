var fs = require('fs');
var Promise = Promise || require('bluebird');
var _ = require('lodash');

var data = {
  d: {}
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
}, {
  path: '/root/files/name:string',
  resolver: {
    get: {
      buffer: function(context) {
        return new Promise(function(resolve, reject) {
          fs.readFile(__dirname + '/../files/' + context.name, function(err, buffer) {
            if(err) {
              return reject(err);
            }
            
            resolve(buffer);
          });
        });
      },
      stream: function(context) {
        return new Promise(function(resolve, reject) {
          var stream = fs.createReadStream(__dirname + '/../files/' + context.name);
          resolve(stream);
        });
      }
    },
    set: {
      buffer: function(context, value) {
        return new Promise(function(resolve, reject) {
          fs.writeFile(__dirname + '/../files/' + context.name, value, function(err, buffer) {
            if(err) {
              return reject(err);
            }
            
            resolve(buffer);
          });
        });
      },
      stream: function(context, value) {
        return new Promise(function(resolve, reject) {
          var stream = fs.createWriteStream(__dirname + '/../files/' + context.name);
          value.pipe(stream).on('error', reject).on('finish', resolve);
        });
      }
    },
    del: function(context) {
      return new Promise(function(resolve, reject) {
        fs.unlink(__dirname + '/../files/' + context.name, function(err, buffer) {
          if(err) {
            return reject(err);
          }

          resolve(true);
        });
      });
    }
  }
}];
resolvers.setData = function(value) {
  data = value;
};

module.exports = resolvers;
