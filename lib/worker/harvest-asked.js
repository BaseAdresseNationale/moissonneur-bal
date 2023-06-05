const pMap = require('p-map')

const Source = require('../models/source')
const {harvestSource} = require('../harvest')

async function harvestAsked() {
  console.log('Moissonnage des sources demandés par un administrateur')

  const sourcesToHarvest = await Source.getAskedHarvest()
  console.log(`${sourcesToHarvest.length} sources à moissonner`)

  await pMap(sourcesToHarvest, async source => {
    return harvestSource(source._id)
  }, {concurrency: 2})

  console.log('Moissonnage des sources demandés par un administrateur: OK!')
}

module.exports = {harvestAsked}
