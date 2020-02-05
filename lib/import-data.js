const customImportData = require('./importers/custom').importData
const balImportData = require('./bal').importData

function importData(config) {
  if (config.importer) {
    return customImportData(config.importer)
  }

  if (config.url) {
    return balImportData(config.url)
  }

  throw new Error('Configuration incomplète')
}

module.exports = importData
