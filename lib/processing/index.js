const Keyv = require('keyv')
const chalk = require('chalk')
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

  if (cacheEntry && (!resourcesHash || cacheEntry.resourcesHash === resourcesHash)) {
    return cacheEntry.processedData
  }

  try {
    const processedData = await extractAdresses(source)
    await processedDataCache.set(meta.id, {processedData, resourcesHash})
    return processedData
  } catch {
    console.log(chalk.red(`${source.meta.title} - Impossible d’extraire les adresses des nouveaux fichiers`))
    return cacheEntry
  }

}

async function processSource(source) {
  try {
    await fetchResources(source.resources)
    const resourcesHash = await hashResources(source.resources)
    return getProcessedData(source, resourcesHash)
  } catch {
    console.log(chalk.red(`${source.meta.title} - Impossible de télécharger les fichiers`))
    return getProcessedData(source, null)
  }
}

module.exports = {extractAdresses, getProcessedData, processSource}
