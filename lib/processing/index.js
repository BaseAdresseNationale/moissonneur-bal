const Keyv = require('@livingdata/keyv')
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
  } catch (error) {
    console.log(chalk.red(`${source.meta.title} - Impossible d’extraire les adresses des nouveaux fichiers`))
    console.log(error)

    if (cacheEntry) {
      console.log(chalk.yellow(`${source.meta.title} - Utilisation des données en cache`))
      return cacheEntry
    }

    console.log(chalk.red(`${source.meta.title} - Pas de données disponibles`))
    throw new Error('No data')
  }
}

async function processSource(source) {
  try {
    await fetchResources(source.resources)
    const resourcesHash = await hashResources(source.resources)
    return getProcessedData(source, resourcesHash)
  } catch (error) {
    console.log(chalk.red(`${source.meta.title} - Impossible de télécharger les fichiers`))
    console.log(error.message)
    return getProcessedData(source, null)
  }
}

module.exports = {extractAdresses, getProcessedData, processSource}
