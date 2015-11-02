/*jslint node:true, multistr: true */
'use strict';

var repl = require('repl');
var url = require('url');
var path = require('path');

var pathStack = [''];

var defaultAction = 'get';
var defaultProtocol = 'data';

var Unity;
var unityInstance;

var legalActions = ['cd', 'pwd', 'get', 'set', 'add', 'del', 'inc', 'dec', 'cpy', 'mov', 'run'];

function evaluateCommand(cmd, context, filename, callback) {
  var cmdElems = cmd.split(/\s+/).slice(0, -1);
  var action;
  var urlToResolve;
  var value;
  var query;
  var protocol;

  // Check for action value in first part of command
  if (~legalActions.indexOf(cmdElems[0])) {
    action = cmdElems.shift();
  } else {
    action = defaultAction;
  }

  // Get path expression
  if (cmdElems[0]) {
    var parsedUrl = url.parse(cmdElems.shift());
    var urlExpr = parsedUrl.pathname;
    query = parsedUrl.search || '';
    // console.log('repl.js:50 - parsedUrl', parsedUrl);
    protocol = parsedUrl.protocol;
    if (urlExpr === '..') {
      // Go up
      urlToResolve = pathStack.slice(0, -1).join('/');
    } else if (urlExpr[0] === '/') {
      // Absolute path
      urlToResolve = urlExpr;
    } else {
      // Assume relative path
      urlToResolve = pathStack.concat(urlExpr.split(/\/+/)).join('/');
    }
  } else {
    urlToResolve = pathStack.join('/');
  }

  // Get value
  if (cmdElems[0]) {
    value = cmdElems.shift();
  }

  protocol = protocol || defaultProtocol;

  switch (action) {
    case 'cd':
      pathStack = urlToResolve.split(/\/+/);
      callback(null, pathStack.join('/'));
      break;

    case 'pwd':
      callback(null, pathStack.join('/'));
      break;

    case 'get':
    case 'del':
      var items = unityInstance.getPath(urlToResolve).items;
      try {
        unityInstance[action](protocol + '://' + urlToResolve, context).then(function (res) {
          return callback(null, Array.isArray(res) ? res.concat(items) : [res].concat(items));
        });
      } catch (err) {
        if (err instanceof Unity.UnresolvablePathError) {
          return callback(null, items);
        }
        throw err;
      }
      break;

    case 'set':
    case 'inc':
    case 'dec':
    case 'add':
    case 'cpy':
    case 'mov':
    case 'run':
      unityInstance[action](urlToResolve, value, context).then(function (res) {
        return callback(null, res);
      });
      break;

    default:
      callback(null, 'Not understood');
      break;
  }
}

function startRepl(UnityClass, instance, options) {
  if (options && options.cwd) {
    pathStack = options.cwd.split('/');
  }

  Unity = UnityClass;
  unityInstance = instance;

  var unityRepl = repl.start({
    eval: evaluateCommand
  });
  return unityRepl;
}

exports.startRepl = startRepl;