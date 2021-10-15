const mongo = require('../util/mongo')

async function setOthersAsDeleted(activeIds) {
  await mongo.db.collection('sources').updateMany({_id: {$nin: activeIds}}, {$set: {_deleted: true}})
}

async function upsert(source) {
  await mongo.db.collection('sources').findOneAndUpdate(
    {_id: source._id},
    {
      $set: {
        ...source,
        _deleted: false
      },
      $setOnInsert: {
        _created: new Date(),
        harvesting: {
          lastHarvest: null,
          harvestingSince: null
        }
      }
    },
    {upsert: true}
  )
}

module.exports = {setOthersAsDeleted, upsert}
