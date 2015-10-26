/*jslint node:true, multistr: true */
'use strict';

let actions = [
  'get',
  'set',
  'add',
  'del',
  'inc',
  'dec'
];
let defaultAction = 'get';

let protocols = [
  'data',
  'buffer',
  'stream',
  'notify'
];
let defaultProtocol = 'data';

let rs = Symbol('resolver');
// let rs = 'resolver';

class UndefinedActionError extends Error {}
class UndefinedProtocolError extends Error {}

class Resolver {

  constructor(root, resolvers, options) {
    this.root = root;

    this[rs] = {
      defer: {},
      resolve: {}
    };

    actions.forEach(a => this[rs].defer[a] = false);
    actions.forEach(a => this[rs].resolve[a] = {});

    this.initResolvers(resolvers);
  }

  initResolvers(resolvers) {
    let self = this;
    // Concise syntax for a read-only resolver
    if (typeof resolvers === 'function') {
      // Set default get to this function
      self[rs].resolve[defaultAction][defaultProtocol] = resolvers;
    }

    // Multiple resolvers, loop through actions
    if (typeof resolvers === 'object') {
      Object.keys(self[rs].resolve).forEach(function(action) {
        if (resolvers[action]) {
          // Concise syntax for single-protocol actions
          if (typeof resolvers[action] === 'function') {
            self[rs].resolve[action][defaultProtocol] = resolvers[action];
          }
          // Multiple protocols
          if (typeof resolvers[action] === 'object') {
            // Copy all defined actions actions to resolver
            protocols.forEach(p => self[rs].resolve[action][p] = resolvers[action][p]);
          }
        }
      });
    }
  }

  resolve(action, protocol, context, value) {
    action = action || defaultAction;
    protocol = protocol || defaultProtocol;

    if (!this[rs].resolve[action]) {
      throw new UndefinedActionError(`Undefined action: ${action}`);
    }
    if (!this[rs].resolve[action][protocol]) {
      throw new UndefinedProtocolError(`Undefined protocol: ${protocol}`);
    }

    let resolver = this[rs].resolve[action][protocol];

    let result = resolver(context, value);
    return result;
  }
}

Resolver.UndefinedActionError = UndefinedActionError;
Resolver.UndefinedProtocolError = UndefinedProtocolError;

module.exports = Resolver;
