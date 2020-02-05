const customImportData = require('./custom').importData
const balImportData = require('./bal').importData

function importData(source) {
  if (source.importer) {
    return customImportData(source)
  }

  if (source.url) {
    return balImportData(source)
  }

  throw new Error('Configuration incomplète')
}

module.exports = importData
