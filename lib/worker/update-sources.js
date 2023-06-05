
const {computeList} = require('../sources')
const Source = require('../models/source')

async function updateSources() {
  console.log('Mise à jour des sources de données')
  const sources = await computeList()
  await Promise.all(sources.map(async source => Source.upsert(source)))
  await Source.setOthersAsDeleted(sources.map(s => s._id))
  console.log('Mise à jour des sources de données: OK')
}

module.exports = {updateSources}
