const Source = require('../models/source')

async function cleanStalledHarvest() {
  await Source.cleanStalledHarvest()
}

module.exports = {cleanStalledHarvest}
