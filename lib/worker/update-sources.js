
const {computeList} = require('../sources')
const Source = require('../models/source')

async function updateSources() {
  const sources = await computeList()
  await Promise.all(sources.map(async source => Source.upsert(source)))
  await Source.setOthersAsDeleted(sources.map(s => s._id))
}

module.exports = {updateSources}
