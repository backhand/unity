'use strict';

let _ = require('lodash');
let url = require('url');

let parser = require('./parser');
let Resolver = require('./resolver');
let repl = require('./repl');
let promise = typeof Promise === 'undefined' ? require('bluebird') : Promise;

let rootSymbol = typeof Symbol !== 'undefined' ? Symbol('root') : 'root';

let actions = [
  'get',
  'set',
  'add',
  'del',
  'inc',
  'dec',
  'run',
  'cpy',
  'mov',
  'lnk'
];

class UnresolvablePathError extends Error {}
class IllegalQueryError extends Error {}

/**
  @class Unity
  @param {object} options - Options
  @param {string} options.bindings - Root path for bindings
*/
class Unity {

  constructor(options) {
    if (options.bindings) {
      if (typeof options.bindings === 'object') {
        this.bindings = options.bindings;
      } else if (typeof options.bindings === 'string') {
        let requireDirectory = require('require-directory');
        this.bindings = requireDirectory(module, options.bindings);
      }
    }

    // Holds the binding hierarchy
    this[rootSymbol] = {};

    // Load bindings
    _.each(this.bindings, ((r, n) => this.addBinding(r, n)));
  }

  static setHiddenProperty(obj, key, value) {
    Object.defineProperty(obj, key, {
      value: value,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }

  static parseDatatype(v, type) {
    switch (type) {
      case 'int':
        return parseInt(v, 10);

      default:
        return v;
    }
  }

  static keyPrefix(key) {
    return '__unity__' + key;
  }

  static isDefined(val) {
    return typeof val !== 'undefined';
  }

  static isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  static isInteger(n) {
    return !isNaN(parseInt(n, 10)) && isFinite(n);
  }

  static classify(v) {
    if (Unity.isNumber(v)) {
      return Unity.isInteger(v) ? 'int' : 'number';
    }

    if (typeof v === 'string') {
      return 'string';
    }
  }

  static normalizeDefer(defer) {
    let normalized = {};

    // Set all to default value
    let defaultValue = typeof defer === 'boolean' ? defer : false;
    actions.forEach(action => normalized[action] = defaultValue);

    // Individual defer statements
    if (typeof defer === 'object') {
      Object.keys(defer).forEach(function(action) {
        normalized[action] = defer[action];
      });
    }

    return normalized;
  }

  /**
    @method get a value by path
    @memberof Unity
    @instance
    @param {string} path - Path to get
    @param {object} context
  */
  get(path, context) {
    return new promise((r) => r(this.resolvePath(path, 'get', context)));
  }

  /**
    @method set a value for a resolved path
    @memberof Unity
    @instance
    @param {string} path - Path to set
    @param {any} value - Value to set
    @param {object} context
  */
  set(path, value, context) {
    return new promise(r => r(this.resolvePath(path, 'set', context, value)));
  }

  /**
    @method add a value to resolved path
    @memberof Unity
    @instance
    @param {string} path - Path to add to
    @param {any} value - Value to add
    @param {object} context
  */
  add(path, value, context) {
    return new promise(r => r(this.resolvePath(path, 'add', context, value)));
  }

  /**
    @method delete a resolved path
    @memberof Unity
    @instance
    @param {string} path - Path to delete
    @param {object} context
  */
  del(path, context) {
    return new promise(r => r(this.resolvePath(path, 'del', context)));
  }

  /**
    @method increase a value for a resolved path (this should be an atomic operation)
    @memberof Unity
    @instance
    @param {string} path - Path to increase
    @param {any} value - Value to increase by
    @param {object} context
  */
  inc(path, value, context) {
    return new promise(r => r(this.resolvePath(path, 'inc', context, value)));
  }

  /**
    @method decrease a value for a resolved path (this should be an atomic operation)
    @memberof Unity
    @instance
    @param {string} path - Path to decrease
    @param {any} value - Value to decrease by
    @param {object} context
  */
  dec(path, value, context) {
    return new promise(r => r(this.resolvePath(path, 'dec', context, value)));
  }

  /**
    @method Copy a value from one path to another
    @memberof Unity
    @instance
    @param {string} path - Path to copy from 
    @param {string} dest - Destination path
    @param {object} context
  */
  cpy(path, dest, context) {
    return new promise(r => r(this.get(path, context)))
      .then(result => this.set(dest, result, context));
  }

  /**
    @method Move a value from one path to another
    @memberof Unity
    @instance
    @param {string} path - Path to move from
    @param {string} dest - Destination path
    @param {object} context
  */
  mov(path, dest, context) {
    return new promise(r => r(this.get(path, context)))
      .then(result => this.set(dest, result, context))
      .then(result => this.del(path, context));
  }

  /**
    @method Make a 'symlink' from one path to another, e.g. 
      lnk('/a/b:int/c', /d/c, { b: context.b })
    @memberof Unity
    @instance
    @param {string} path - Path to link from
    @param {string} dest - Path to link to
    @param {object} context
  */
  lnk(path, dest, context) {
    throw new Error('Not implemented yet');
  }

  /**
    @method Run a function at given path
    @memberof Unity
    @instance
    @param {string} path - Path to run
    @param {any} args - Arguments to function
    @param {object} context
  */
  run(path, args, context) {
    return this.resolvePath(path, 'run', context, args);
  }

  startRepl(options) {
    repl.startRepl(Unity, this, options);
  }

  /**
   @private
  */
  getHierarchy() {
    return this[rootSymbol];
  }

  /**
   @private
  */
  addBinding(binding, bindingName) {
    let self = this;

    if (Array.isArray(binding)) {
      return _.each(binding, (r, n) => this.addBinding(r, n));
    }
    if (typeof binding === 'object' && !binding.resolver) {
      return _.each(binding, (r, n) => n[0] === '/' ? 
        // Assume this is alternate format bindings, i.e. path -> resolver
        this.addBinding({ path: n, resolver: r }) : 
        // Assume nested structure
        this.addBinding(r, n));
    }

    let resolvePath = binding.path;

    if (!binding.resolver) {
      console.error('No resolver for %s', bindingName);
      return;
    }

    try {
      let parsed = parser.parse(resolvePath);

      let pos = this[rootSymbol];
      parsed.elements.forEach(function(element, index) {
        let lastElement = index === parsed.elements.length - 1;

        let key;
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
          pos.binding.defer = Unity.normalizeDefer(binding.defer);
          Unity.setHiddenProperty(pos, 'resolver', new Resolver(self, binding.resolver));
        }
      });

      if (parsed.query) {
        Unity.setHiddenProperty(pos, 'query', parsed.query);
      }
    } catch (err) {
      console.error(err);
    }
  }

  /**
   @private
  */
  getPath(path, action, context) {
    if (!path) {
      return null;
    }

    let parsed = this.parsePath(path);

    let pos = this[rootSymbol];
    let ctx = _.clone(context || {});
    ctx.protocol = parsed.protocol;
    let deferredResolver;

    for (let i in parsed.elements) {
      let element = parsed.elements[i];

      if (!pos[element.value] && !pos[Unity.keyPrefix(element.datatype)]) {
        throw new UnresolvablePathError(`Unable to resolve path ${path}`);
      }

      if (pos[element.value]) {
        pos = pos[element.value];
      } else if (pos[Unity.keyPrefix(element.datatype)]) {
        // Identifier segment, store content in context
        pos = pos[Unity.keyPrefix(element.datatype)];
        ctx[pos[Unity.keyPrefix('id')]] = Unity.parseDatatype(element.value, element.datatype);
      } else {
        throw new UnresolvablePathError(`Unable to resolve path ${path}`);
      }

      let isDeferredCandidate = pos.binding && 
        !pos.binding.defer[action] && 
         pos.resolver instanceof Resolver;

      if (isDeferredCandidate) {
        deferredResolver = pos.resolver;
      }
    }

    // Verify query
    ctx.query = _.extend(context && context.query || {}, parsed.query);
    if (ctx.query && Object.keys(ctx.query).length > 0) {
      this.verifyQuery(pos.query, ctx.query);
    }

    return {
      items: Object.keys(pos),
      binding: pos.binding,
      resolver: pos.resolver,
      deferredResolver: deferredResolver,
      context: ctx
    };
  }

  /**
   @private
  */
  resolvePath(path, action, context, value) {
    // return Promise.resolve(() => {
      let node = this.getPath(path, action, context);

      if (!node) {
        throw new UnresolvablePathError(`Unable to resolve path ${path}`);
      }

      if (!node.resolver) {
        throw new UnresolvablePathError(`Unable to resolve path ${path}, no resolver`);
      }

      let protocol = node.context.protocol;

      if (node.deferredResolver && node.binding.defer[action]) {
        return node.deferredResolver.resolve(action, protocol, node.context, value).then(function(results) {
          node.context.deferred = results;
          return node.resolver.resolve(action, protocol, node.context, value);
        });
      } else {
        return node.resolver.resolve(action, protocol, node.context, value);
      }
    // });
  }

  /**
   @private
  */
  parsePath(path) {
    let parsed = url.parse(path, true);
    let elements = _(parsed.pathname.split('/'))
      .compact()
      .map(function(element) {
        let datatype = Unity.classify(element);

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

  /**
   @private
  */
  verifyQuery(pattern, query) {
    pattern = pattern || {};
    _.each(query, function(val, key) {
      let p = pattern[key];
      if (!p) {
        throw new IllegalQueryError(`Query argument ${key} is not allowed`);
      }
      let invalidValue = (p.values && !~p.values.indexOf(val)) || typeof p === 'string' && p !== val;
      if (invalidValue) {
        throw new IllegalQueryError(`Value ${val} for query argument ${key} is not allowed`);
      }
    });
  }
}

Unity.UnresolvablePathError = UnresolvablePathError;
Unity.IllegalQueryError = IllegalQueryError;
Unity.UndefinedActionError = Resolver.UndefinedActionError;
Unity.UndefinedProtocolError = Resolver.UndefinedProtocolError;

module.exports = Unity;
