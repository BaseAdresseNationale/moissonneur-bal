const bluebird = require('bluebird')

const Source = require('../models/source')
const {harvestSource} = require('../harvest')

async function harvestNewOrOutdated() {
  console.log('Moissonnage des sources nouvelles et obsolètes')
  const sourcesToHarvest = await Source.findSourcesToHarvest()
  console.log(`${sourcesToHarvest.length} sources à moissonner`)

  await bluebird.map(sourcesToHarvest, async source => {
    harvestSource(source._id)
  }, {concurrency: 8})
  console.log('OK!')
}

module.exports = {harvestNewOrOutdated}
