const Source = require('../models/source')

async function cleanStalledHarvests() {
  console.log('Nettoyage des moissonnages bloqués')
  await Source.cleanStalledHarvests()
  console.log('Nettoyage des moissonnages bloqués: OK')
}

module.exports = {cleanStalledHarvests}
