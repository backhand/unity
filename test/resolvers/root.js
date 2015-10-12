var Promise = Promise || require('bluebird');
var _ = require('lodash');

module.exports = [{
  path: '/root/a/id:int',
  resolve: function(context) {
    var id = context.id;
  
    return new Promise(function(resolve, reject) {
      resolve({
        id: id
      });
    });
  }
}, {
  path: '/root/b/id:string',
  resolve: function(context) {
    var id = context.id;
  
    return new Promise(function(resolve, reject) {
      resolve({
        id: id
      });
    });
  }
}, {
  path: '/root/c?orderBy=id',
  resolve: function(context) {
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
}];


// recipients/contactId:int/messages/messageId:int?orderBy=id&orderDirection=asc|desc
