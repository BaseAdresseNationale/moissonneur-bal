const Harvest = require('../models/harvest')
const Organization = require('../models/organization')
const {fetchHttp} = require('../resources/http')
const {handleNewFile} = require('./handle-new-file')

async function processSource(source, activeHarvest) {
  try {
    // GET LAST HARVEST
    const lastCompletedHarvest = await Harvest.getLastCompletedHarvest(source._id)
    // GET FILE
    const file = await fetchHttp(source.url)
    // GET ORGANIZATION
    const organization = await Organization.fetch(source.organization.id)

    const newHarvest = await handleNewFile(
      activeHarvest,
      file,
      lastCompletedHarvest || {},
      organization
    )
    return newHarvest
  } catch (error) {
    console.log(`${source.title} - Impossible d’accéder aux adresses`)
    console.log(error.message)
    return {error: error.message}
  }
}

module.exports = processSource
