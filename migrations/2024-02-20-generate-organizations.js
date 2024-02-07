#!/usr/bin/env node
require('dotenv').config()
const mongo = require('../lib/util/mongo')
const {updateSources} = require('../lib/worker/update-sources')
const Organization = require('../lib/models/organization')
const Source = require('../lib/models/source')

async function main() {
  await mongo.connect()
  await updateSources()

  const organizations = await Organization.fetchAll()
  for (const orga of organizations) {
    // eslint-disable-next-line no-await-in-loop
    const sources = await Source.getSourceByOganization(orga._id)
    const sourceIds = sources.map(({_id}) => _id)
    // eslint-disable-next-line no-await-in-loop
    const aggregateCodeCommunes = await mongo.db.collection('revisions').aggregate([
      {$match: {sourceId: {$in: sourceIds}}},
      {$group: {_id: '$codeCommune', totaldocs: {$push: 1}}},
    ]).toArray()
    const perimeters = aggregateCodeCommunes.map(({_id}) => {
      return {
        type: 'commune',
        code: _id
      }
    })
    // eslint-disable-next-line no-await-in-loop
    await Organization.update(orga._id, {perimeters})
  }

  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
