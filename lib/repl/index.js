var semver = require('semver');
// Check for node version
if(semver.satisfies(process.version, '>=4.x')) {
  module.exports = require('./repl');
} else {
  module.exports = require('./repl.es5');
}
