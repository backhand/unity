/*jslint node:true, multistr: true */
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _ = require('lodash');
var util = require('util');
var url = require('url');

var parser = require('./parser');
var Resolver = require('./resolver');

var rootSymbol = typeof Symbol !== 'undefined' ? Symbol('root') : 'root';

var UnresolvablePathError = (function (_Error) {
  _inherits(UnresolvablePathError, _Error);

  function UnresolvablePathError() {
    _classCallCheck(this, UnresolvablePathError);

    _get(Object.getPrototypeOf(UnresolvablePathError.prototype), 'constructor', this).apply(this, arguments);
  }

  return UnresolvablePathError;
})(Error);

var IllegalQueryError = (function (_Error2) {
  _inherits(IllegalQueryError, _Error2);

  function IllegalQueryError() {
    _classCallCheck(this, IllegalQueryError);

    _get(Object.getPrototypeOf(IllegalQueryError.prototype), 'constructor', this).apply(this, arguments);
  }

  /**
    @class Unity
    @param {object} options - Options
    @param {string} options.bindings - Root path for bindings
  */
  return IllegalQueryError;
})(Error);

var Unity = (function () {
  function Unity(options) {
    var _this = this;

    _classCallCheck(this, Unity);

    if (options.bindings) {
      if (typeof options.bindings === 'object') {
        this.bindings = options.bindings;
      } else if (typeof options.bindings === 'string') {
        var requireDirectory = require('require-directory');
        this.bindings = requireDirectory(module, options.bindings);
      }
    }

    // if (!this.bindings) {
    //   throw new Error('No bindings defined');
    // }

    this[rootSymbol] = {};

    // Load bindings
    _.each(this.bindings, function (r, n) {
      return _this.addBinding(r, n);
    });
  }

  _createClass(Unity, [{
    key: 'get',

    /**
      @method get
      @param {object} options - Options
      @param {string} options.bindings - Root path for bindings
    */
    value: function get(path, context) {
      return this.resolvePath(path, 'get', context);
    }
  }, {
    key: 'set',
    value: function set(path, value, context) {
      return this.resolvePath(path, 'set', context, value);
    }
  }, {
    key: 'add',
    value: function add(path, value, context) {
      return this.resolvePath(path, 'add', context, value);
    }
  }, {
    key: 'del',
    value: function del(path, context) {
      return this.resolvePath(path, 'del', context);
    }
  }, {
    key: 'inc',
    value: function inc(path, value, context) {
      return this.resolvePath(path, 'inc', context, value);
    }
  }, {
    key: 'dec',
    value: function dec(path, value, context) {
      return this.resolvePath(path, 'dec', context, value);
    }
  }, {
    key: 'cpy',
    value: function cpy(path, dest, context) {
      var _this2 = this;

      return this.get(path, context).then(function (result) {
        return _this2.set(dest, result, context);
      });
    }
  }, {
    key: 'mov',
    value: function mov(path, dest, context) {
      var _this3 = this;

      return this.get(path, context).then(function (result) {
        return _this3.set(dest, result, context);
      }).then(function (result) {
        return _this3.del(path, context);
      });
    }
  }, {
    key: 'getHierarchy',
    value: function getHierarchy() {
      return this[rootSymbol];
    }
  }, {
    key: 'addBinding',
    value: function addBinding(binding, bindingName) {
      var _this4 = this;

      var self = this;

      if (Array.isArray(binding)) {
        return _.each(binding, function (r, n) {
          return _this4.addBinding(r, n);
        });
      }
      if (typeof binding === 'object' && !binding.resolver) {
        // Assume this is a nested structure, add recursively
        return _.each(binding, function (r, n) {
          return _this4.addBinding(r, n);
        });
      }

      var resolvePath = binding.path;

      if (!binding.resolver) {
        console.error('No resolver for %s', bindingName);
        return;
      }

      try {
        (function () {
          var parsed = parser.parse(resolvePath);

          // let self = this;
          var pos = _this4[rootSymbol];
          parsed.elements.forEach(function (element, index) {
            var lastElement = index === parsed.elements.length - 1;

            var key = undefined;
            switch (element.type) {
              case 'identifier':
                key = Unity.keyPrefix(element.datatype);
                if (!pos[key]) {
                  Unity.setHiddenProperty(pos, key, {});
                }
                Unity.setHiddenProperty(pos[key], Unity.keyPrefix('id'), element.id);
                break;

              case 'segment':
                key = element.name;
                if (!pos[key]) {
                  pos[key] = {};
                }
                break;
            }

            pos = pos[key];

            if (lastElement) {
              Unity.setHiddenProperty(pos, 'binding', binding);
              Unity.setHiddenProperty(pos, 'resolver', new Resolver(self, binding.resolver));
            }
          });

          if (parsed.query) {
            Unity.setHiddenProperty(pos, 'query', parsed.query);
          }
        })();
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
      var deferredResolver = undefined;

      for (var i in parsed.elements) {
        var lastElement = i === parsed.length - 1;
        var element = parsed.elements[i];
        var key = undefined;

        if (!pos[element.value] && !pos[Unity.keyPrefix(element.datatype)]) {
          throw new UnresolvablePathError('Unable to resolve path ' + path);
        }

        if (pos[element.value]) {
          pos = pos[element.value];
        } else if (pos[Unity.keyPrefix(element.datatype)]) {
          // Identifier segment, store content in context
          pos = pos[Unity.keyPrefix(element.datatype)];
          ctx[pos[Unity.keyPrefix('id')]] = Unity.parseDatatype(element.value, element.datatype);
        } else {
          throw new UnresolvablePathError('Unable to resolve path ' + path);
        }

        if (pos.binding && !pos.binding.defer && pos.resolver instanceof Resolver) {
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
        items: Object.keys(pos),
        binding: pos.binding,
        resolver: pos.resolver,
        deferredResolver: deferredResolver,
        context: ctx
      };
    }
  }, {
    key: 'resolvePath',
    value: function resolvePath(path, action, context, value) {
      var node = this.getPath(path, context);

      if (!node) {
        throw new UnresolvablePathError('Unable to resolve path ' + path);
      }

      if (!node.resolver) {
        throw new UnresolvablePathError('Unable to resolve path ' + path + ', no resolver');
      }

      var protocol = node.context.protocol;

      if (node.deferredResolver && node.binding.defer) {
        return node.deferredResolver.resolve(action, protocol, node.context, value).then(function (results) {
          node.context.deferred = results;
          return node.resolver.resolve(action, protocol, node.context, value);
        });
      } else {
        return node.resolver.resolve(action, protocol, node.context, value);
      }
    }
  }, {
    key: 'parsePath',
    value: function parsePath(path) {
      var parsed = url.parse(path, true);
      var elements = _(parsed.pathname.split('/')).compact().map(function (element) {
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
          throw new IllegalQueryError('Query argument ' + key + ' is not allowed');
        }
        var invalidValue = p.values && ! ~p.values.indexOf(val) || typeof p === 'string' && p !== val;
        if (invalidValue) {
          throw new IllegalQueryError('Value ' + val + ' for query argument ' + key + ' is not allowed');
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
    key: 'keyPrefix',
    value: function keyPrefix(key) {
      return '__unity__' + key;
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

Unity.UnresolvablePathError = UnresolvablePathError;
Unity.IllegalQueryError = IllegalQueryError;
Unity.UndefinedActionError = Resolver.UndefinedActionError;
Unity.UndefinedProtocolError = Resolver.UndefinedProtocolError;

module.exports = Unity;
