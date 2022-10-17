const Source = require('../models/source')

async function cleanStalledHarvests() {
  await Source.cleanStalledHarvests()
}

module.exports = {cleanStalledHarvests}
