const Keyv = require('keyv')
const {fetchResources, hashResources} = require('../resources')
const extractAdressesCustom = require('../importers/custom').importData
const extractAdressesBAL = require('../importers/bal').importData

const processedDataCache = new Keyv('sqlite://processed-data.cache.sqlite')

function extractAdresses(source) {
  if (source.importer) {
    return extractAdressesCustom(source)
  }

  if (source.url) {
    return extractAdressesBAL(source)
  }

  throw new Error('Configuration incomplète')
}

async function getProcessedData(source, resourcesHash) {
  const {meta} = source
  const cacheEntry = await processedDataCache.get(meta.id)

  if (cacheEntry && cacheEntry.resourcesHash === resourcesHash) {
    return cacheEntry.processedData
  }

  const processedData = await extractAdresses(source)
  await processedDataCache.set(meta.id, {processedData, resourcesHash})
  return processedData
}

async function processSource(source) {
  await fetchResources(source.resources)
  const resourcesHash = await hashResources(source.resources)
  return getProcessedData(source, resourcesHash)
}

module.exports = {extractAdresses, getProcessedData, processSource}
