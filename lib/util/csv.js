const {promisify} = require('util')
const zlib = require('zlib')
const Papa = require('papaparse')
const {outputFile} = require('fs-extra')

const gzip = promisify(zlib.gzip)

async function writeCsv(destination, rows, options = {}) {
  options = {
    delimiter: ';',
    gzip: destination.endsWith('.gz'),
    ...options
  }

  const csvContent = Papa.unparse(rows, {delimiter: options.delimiter})
  const fileContent = options.gzip === true
    ? await gzip(csvContent)
    : csvContent
  await outputFile(destination, fileContent)
}

module.exports = {writeCsv}
