var promise = typeof Promise !== 'undefined' ? Promise : require('bluebird');

exports['/root/e/f'] = {
  get: function(context) {
    return new promise(function(resolve, reject) {
      resolve('123');
    });
  }
};

exports['/root/e/g'] = {
  get: function(context) {
    return new promise(function(resolve, reject) {
      resolve('321');
    });
  }
};
