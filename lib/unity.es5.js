/*jslint node:true, multistr: true */
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _ = require('lodash');
var util = require('util');
var url = require('url');
var parser = require('./parser');

var rootSymbol = Symbol('root');

var Unity = (function () {
  function Unity(options) {
    var _this = this;

    _classCallCheck(this, Unity);

    if (options.resolvers) {
      if (typeof options.resolvers === 'object') {
        this.resolvers = options.resolvers;
      } else if (typeof options.resolvers === 'string') {
        var requireDirectory = require('require-directory');
        this.resolvers = requireDirectory(module, options.resolvers);
      }
    }

    if (!this.resolvers) {
      throw new Error('No resolvers defined');
    }

    this[rootSymbol] = {};

    // Load resolvers
    _.each(this.resolvers, function (r, n) {
      return _this.addResolver(r, n);
    });
  }

  _createClass(Unity, [{
    key: 'getHierarchy',
    value: function getHierarchy() {
      return this[rootSymbol];
    }
  }, {
    key: 'addResolver',
    value: function addResolver(resolver, resolverName) {
      var _this2 = this;

      if (Array.isArray(resolver)) {
        return _.each(resolver, function (r, n) {
          return _this2.addResolver(r, n);
        });
      }
      if (typeof resolver === 'object' && !resolver.resolve) {
        // Assume this is a nested structure, add recursively
        return _.each(resolver, function (r, n) {
          return _this2.addResolver(r, n);
        });
      }

      var resolvePath = resolver.path;
      var resolve = resolver.resolve;

      if (!resolver.resolve) {
        console.error('No resolve function for %s', resolverName);
        return;
      }

      try {
        var parsed = parser.parse(resolvePath);

        // var self = this;
        var pos = this[rootSymbol];
        parsed.elements.forEach(function (element, index) {
          var lastElement = index === parsed.elements.length - 1;

          var key;
          switch (element.type) {
            case 'identifier':
              key = '_' + element.datatype;
              if (!pos[key]) {
                Unity.setHiddenProperty(pos, key, {});
              }
              Unity.setHiddenProperty(pos[key], '_id', element.id);
              break;

            case 'segment':
              key = element.name;
              if (!pos[key]) {
                pos[key] = {};
              }
              break;
          }

          // if(!pos[key]) {
          //   Unity.setHiddenProperty(pos, key, {});
          //   // pos[key] = {};
          // }
          pos = pos[key];

          // if(key[0] === '_') {
          //   Unity.setHiddenProperty(pos, '_id', element.id);
          //   // pos._id = element.id;
          // }

          if (lastElement) {
            Unity.setHiddenProperty(pos, 'resolver', resolver);
          }
        });

        if (parsed.query) {
          Unity.setHiddenProperty(pos, 'query', parsed.query);
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, {
    key: 'getPath',
    value: function getPath(path, context) {
      if (!path) {
        return null;
      }

      var parsed = this.parsePath(path);

      var pos = this[rootSymbol];
      var ctx = _.clone(context || {});
      ctx.protocol = parsed.protocol;
      var deferredResolver;

      for (var i in parsed.elements) {
        var lastElement = i === parsed.length - 1;
        var element = parsed.elements[i];
        var key;

        if (!pos[element.value] && !pos['_' + element.datatype]) {
          throw new Error('Unable to resolve path ' + path);
        }

        if (pos[element.value]) {
          pos = pos[element.value];
        } else if (pos['_' + element.datatype]) {
          pos = pos['_' + element.datatype];
          // Value segment, store content in context
          ctx[pos._id] = Unity.parseDatatype(element.value, element.datatype);
        } else {
          throw new Error('Unable to resolve path ' + path);
        }

        if (pos.resolver && !pos.resolver.defer && typeof pos.resolver.resolve === 'function') {
          deferredResolver = pos.resolver;
        }
      }

      // Verify query
      if (parsed.query && Object.keys(parsed.query).length > 0) {
        this.verifyQuery(pos.query, parsed.query);
        ctx.query = parsed.query;
      } else {
        ctx.query = {};
      }

      return {
        node: pos,
        deferredResolver: deferredResolver,
        context: ctx
      };
    }
  }, {
    key: 'resolvePath',
    value: function resolvePath(path, context, value) {
      var pos = this.getPath(path, context);

      if (!pos) {
        throw new Error('Unable to resolve path ' + path);
      }

      if (!pos.node.resolver || typeof pos.node.resolver.resolve !== 'function') {
        throw new Error('Unable to resolve path ' + path + ', no resolver');
      }

      var protocol = pos.context.protocol;
      var applyProtocol = function applyProtocol(results) {
        if (protocol) {
          var protocolHandler = pos.node.resolver.protocol && pos.node.resolver.protocol[protocol];
          if (!protocolHandler) {
            throw new Error('Protocol ' + protocol + ' for path ' + path + ' is not defined');
          }

          return protocolHandler(results, context);
        }

        return results;
      };

      if (pos.deferredResolver && pos.node.resolver.defer) {
        return pos.deferredResolver.resolve(pos.context).then(function (results) {
          pos.context.deferred = results;
          var resolved = pos.node.resolver.resolve(pos.context);
          return resolved.then ? resolved.then(applyProtocol) : applyProtocol(resolved);
        });
      } else {
        var resolved = pos.node.resolver.resolve(pos.context);
        return resolved.then ? resolved.then(applyProtocol) : applyProtocol(resolved);
      }
    }
  }, {
    key: 'parsePath',

    // Unity.prototype.set = function(path, value) {
    //   return this.resolvePath(path, {}, value);
    // };

    value: function parsePath(path) {
      var parsed = url.parse(path, true);
      var elements = _(parsed.pathname.split('/'))
      // .chain()
      .compact().map(function (element) {
        var datatype = Unity.classify(element);

        return {
          type: 'value',
          datatype: datatype,
          value: element
        };
      }).value();

      return {
        elements: elements,
        query: parsed.query,
        protocol: parsed.protocol && parsed.protocol.replace(':', '')
      };
    }
  }, {
    key: 'verifyQuery',
    value: function verifyQuery(pattern, query) {
      pattern = pattern || {};
      _.each(query, function (val, key) {
        var p = pattern[key];
        if (!p) {
          throw new Error('Query argument ' + key + '  is not allowed');
        }
        var invalidValue = p.values && ! ~p.values.indexOf(val) || typeof p === 'string' && p !== val;
        if (invalidValue) {
          throw new Error('Value ' + val + ' for query argument ' + key + ' is not allowed');
        }
      });
    }
  }], [{
    key: 'setHiddenProperty',
    value: function setHiddenProperty(obj, key, value) {
      Object.defineProperty(obj, key, {
        value: value,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  }, {
    key: 'parseDatatype',
    value: function parseDatatype(v, type) {
      switch (type) {
        case 'int':
          return parseInt(v, 10);

        default:
          return v;
      }
    }
  }, {
    key: 'isDefined',
    value: function isDefined(val) {
      return typeof val !== 'undefined';
    }
  }, {
    key: 'isNumber',
    value: function isNumber(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    }
  }, {
    key: 'isInteger',
    value: function isInteger(n) {
      return !isNaN(parseInt(n, 10)) && isFinite(n);
    }
  }, {
    key: 'classify',
    value: function classify(v) {
      if (Unity.isNumber(v)) {
        return Unity.isInteger(v) ? 'int' : 'number';
      }

      if (typeof v === 'string') {
        return 'string';
      }
    }
  }]);

  return Unity;
})();

module.exports = Unity;
