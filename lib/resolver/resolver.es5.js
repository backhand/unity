/*jslint node:true, multistr: true */
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var actions = ['get', 'set', 'add', 'del', 'inc', 'dec', 'run'];
var defaultAction = 'get';

var protocols = ['data', 'buffer', 'stream', 'notify'];
var defaultProtocol = 'data';

var rs = typeof Symbol !== 'undefined' ? Symbol('resolver') : 'resolver';

var UndefinedActionError = (function (_Error) {
  _inherits(UndefinedActionError, _Error);

  function UndefinedActionError() {
    _classCallCheck(this, UndefinedActionError);

    _get(Object.getPrototypeOf(UndefinedActionError.prototype), 'constructor', this).apply(this, arguments);
  }

  return UndefinedActionError;
})(Error);

var UndefinedProtocolError = (function (_Error2) {
  _inherits(UndefinedProtocolError, _Error2);

  function UndefinedProtocolError() {
    _classCallCheck(this, UndefinedProtocolError);

    _get(Object.getPrototypeOf(UndefinedProtocolError.prototype), 'constructor', this).apply(this, arguments);
  }

  return UndefinedProtocolError;
})(Error);

var Resolver = (function () {
  function Resolver(root, resolvers, options) {
    var _this = this;

    _classCallCheck(this, Resolver);

    this.root = root;

    this[rs] = {
      // defer: {},
      resolve: {}
    };

    // actions.forEach(a => this[rs].defer[a] = false);
    actions.forEach(function (a) {
      return _this[rs].resolve[a] = {};
    });

    this.initResolvers(resolvers);
  }

  _createClass(Resolver, [{
    key: 'initResolvers',
    value: function initResolvers(resolvers) {
      var self = this;
      // Concise syntax for a read-only resolver
      if (typeof resolvers === 'function') {
        // Set default get to this function
        self[rs].resolve[defaultAction][defaultProtocol] = resolvers;
      }

      // Multiple resolvers, loop through actions
      if (typeof resolvers === 'object') {
        Object.keys(self[rs].resolve).forEach(function (action) {
          if (resolvers[action]) {
            // Concise syntax for single-protocol actions
            if (typeof resolvers[action] === 'function') {
              self[rs].resolve[action][defaultProtocol] = resolvers[action];
            }
            // Multiple protocols
            if (typeof resolvers[action] === 'object') {
              // Copy all defined actions actions to resolver
              protocols.forEach(function (p) {
                return self[rs].resolve[action][p] = resolvers[action][p];
              });
            }
          }
        });
      }
    }
  }, {
    key: 'resolve',
    value: function resolve(action, protocol, context, value) {
      action = action || defaultAction;
      protocol = protocol || defaultProtocol;

      if (!this[rs].resolve[action] || !Object.keys(this[rs].resolve[action]).length) {
        throw new UndefinedActionError('Undefined action: ' + action);
      }
      if (!this[rs].resolve[action][protocol]) {
        throw new UndefinedProtocolError('Undefined protocol: ' + protocol);
      }

      var resolver = this[rs].resolve[action][protocol];

      var result = resolver(context, value);
      return result;
    }
  }]);

  return Resolver;
})();

Resolver.UndefinedActionError = UndefinedActionError;
Resolver.UndefinedProtocolError = UndefinedProtocolError;

module.exports = Resolver;
