const pMap = require('p-map')

const Source = require('../models/source')
const {harvestSource} = require('../harvest')

async function harvestNewOrOutdated() {
  console.log('Moissonnage des sources nouvelles et obsolètes')
  const sourcesToHarvest = await Source.findSourcesToHarvest()
  console.log(`${sourcesToHarvest.length} sources à moissonner`)

  await pMap(sourcesToHarvest, async source => {
    return harvestSource(source._id)
  }, {concurrency: 2})
  console.log('OK!')
}

module.exports = {harvestNewOrOutdated}
