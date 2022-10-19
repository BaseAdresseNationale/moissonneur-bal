const bluebird = require('bluebird')

const Source = require('../models/source')
const {harvestSource} = require('../harvest')

async function harvestEnabled() {
  console.log('Moissonnage des sources actives')

  const sourcesToHarvest = await Source.getEnabledSources()
  console.log(`${sourcesToHarvest.length} sources à moissonner`)

  await bluebird.map(sourcesToHarvest, async source => {
    harvestSource(source._id)
  }, {concurrency: 8})

  console.log('OK!')
}

module.exports = {harvestEnabled}
