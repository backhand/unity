// Check for node version
var semver = require('semver');
if(semver.satisfies(process.version, '>=4.x')) {
  module.exports = require('./unity');
} else {
  module.exports = require('./unity.es5');
}
