const bluebird = require('bluebird')

const Source = require('../models/source')
const {harvestSource} = require('../harvest')

async function harvestNewOrOutdated(sources = null) {
  const sourcesToHarvest = sources || await Source.findSourcesToHarvest()
  console.log(`${sourcesToHarvest.length} sources à moissonner`)

  await bluebird.map(sourcesToHarvest, async source => {
    harvestSource(source._id)
  }, {concurrency: 8})
}

async function runWorkflow() {
  console.log('Moissonnage des sources nouvelles et obsolètes')
  await harvestNewOrOutdated()
  console.log('OK!')
}

module.exports = {runWorkflow, harvestNewOrOutdated}
