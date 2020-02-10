const Keyv = require('keyv')
const customImportData = require('../importers/custom').importData
const balImportData = require('../importers/bal').importData

const processedDataCache = new Keyv('sqlite://processed-data.cache.sqlite')

function importData(source) {
  if (source.importer) {
    return customImportData(source)
  }

  if (source.url) {
    return balImportData(source)
  }

  throw new Error('Configuration incomplète')
}

async function getData(source) {
  const {meta, resourcesHash} = source
  const cacheEntry = await processedDataCache.get(meta.id)

  if (cacheEntry && cacheEntry.resourcesHash === resourcesHash) {
    return cacheEntry.processedData
  }

  const processedData = await importData(source)
  await processedDataCache.set(meta.id, {processedData, resourcesHash})
  return processedData
}

module.exports = {getData, importData}
