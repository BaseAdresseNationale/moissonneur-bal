const Source = require('../models/source')

const {harvestNewOrOutdated} = require('./run-workflow')

async function harvestRequestedSources() {
  console.log('Moissonnage des sources demandées')

  const sources = await Source.getAskedHarvest()
  if (sources.length === 0) {
    console.log('Pas de sources à moissonner')
    return
  }

  await harvestNewOrOutdated(sources)

  console.log('OK!')
}

module.exports = {harvestRequestedSources}
