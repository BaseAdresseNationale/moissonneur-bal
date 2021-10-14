const stringify = require('fast-json-stable-stringify')
const revisionHash = require('rev-hash')

function hashObject(obj) {
  return revisionHash(stringify(obj))
}

module.exports = hashObject
