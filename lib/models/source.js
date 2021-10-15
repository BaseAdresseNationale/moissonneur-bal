const sub = require('date-fns/sub')
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
          lastHarvest: new Date('1970-01-01'),
          lastHarvestStatus: null,
          harvestingSince: null
        }
      }
    },
    {upsert: true}
  )
}

async function findSourcesToHarvest() {
  return mongo.db.collection('sources').find({
    _deleted: false,
    'harvesting.harvestingSince': null,
    'harvesting.lastHarvest': {$lt: sub(new Date(), {hours: 6})}
  }).toArray()
}

async function finishedHarvesting(sourceId, harvestDate, status) {
  await mongo.db.collection('sources').updateOne(
    {_id: sourceId},
    {$set: {
      'harvesting.lastHarvest': harvestDate,
      'harvesting.harvestingSince': null,
      'harvesting.lastHarvestStatus': status
    }}
  )
}

module.exports = {setOthersAsDeleted, upsert, findSourcesToHarvest, finishedHarvesting}
