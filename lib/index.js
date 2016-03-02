var semver = require('semver');
// Check for node version
if(semver.satisfies(process.version, '>=4.x')) {
  module.exports = require('./unity');
} else {
  module.exports = require('./unity.es5');
}
