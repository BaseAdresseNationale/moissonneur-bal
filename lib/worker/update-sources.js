
const {computeList} = require('../sources')
const Source = require('../models/source')
const Organization = require('../models/organization')

async function updateSources() {
  const {sources, organizations} = await computeList()
  // UPSERT SOURCE
  await Promise.all(sources.map(async source => Source.upsert(source)))
  await Source.setOthersAsDeleted(sources.map(s => s._id))
  // UPSERT ORGANIZATION
  await Promise.all(organizations.map(async organization => Organization.upsert(organization)))
  await Organization.softDeleteInactive(organizations.map(s => s.id))
}

module.exports = {updateSources}
