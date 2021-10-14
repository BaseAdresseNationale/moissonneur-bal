const {promisify} = require('util')
const zlib = require('zlib')

const gzip = promisify(zlib.gzip)

module.exports = {gzip}
