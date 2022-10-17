const bluebird = require('bluebird')

const Source = require('../models/source')
const {harvestSource} = require('../harvest')

async function harvestAsked() {
  console.log('Moissonnage des sources demandés par un administrateur')

  const sourcesToHarvest = await Source.getAskedHarvest()
  console.log(`${sourcesToHarvest.length} sources à moissonner`)

  await bluebird.map(sourcesToHarvest, async source => {
    harvestSource(source._id)
  }, {concurrency: 8})

  console.log('OK!')
}

module.exports = {harvestAsked}
