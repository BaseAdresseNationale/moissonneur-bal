const chalk = require('chalk')
const {keyBy} = require('lodash')
const {fetchAllIfUpdated} = require('../resources')
const extractAdressesCustom = require('../converters/custom').importData
const extractAdressesBAL = require('../converters/bal').importData

function extractAdresses(source) {
  if (source.converter) {
    return extractAdressesCustom(source)
  }

  if (source.url) {
    return extractAdressesBAL(source)
  }

  throw new Error('Configuration incomplète')
}

async function processSource(source) {
  try {
    const flattenedResources = Object.keys(source.resources)
      .map(resourceName => ({name: resourceName, ...source.resources[resourceName]}))

    const fetchedResources = await fetchAllIfUpdated(flattenedResources)
    source.resources = keyBy(fetchedResources, 'name')
    return await extractAdresses(source)
  } catch (error) {
    console.log(chalk.red(`${source.meta.title} - Impossible d’accéder aux adresses`))
    console.log(error)
  }
}

module.exports = {processSource}
