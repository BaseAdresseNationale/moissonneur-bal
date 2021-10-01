const Papa = require('papaparse')
const {outputFile} = require('fs-extra')

async function writeCsv(destination, rows) {
  await outputFile(destination, Papa.unparse(rows, {delimiter: ';'}))
}

module.exports = {writeCsv}
