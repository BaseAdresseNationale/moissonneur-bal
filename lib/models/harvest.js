const mongo = require('../util/mongo')

async function startHarvesting(sourceId, harvestDate) {
  const harvest = {
    _id: new mongo.ObjectId(),
    sourceId,
    status: 'active',
    startedAt: harvestDate
  }

  await mongo.db.collection('harvests').insertOne(harvest)

  return harvest
}

async function finishHarvesting(harvestId, changes) {
  return mongo.db.collection('harvests').findOneAndUpdate(
    {_id: harvestId},
    {$set: {...changes, finishedAt: new Date()}},
    {returnDocument: 'after'}
  )
}

async function getActiveHarvest(sourceId) {
  return mongo.db.collection('harvests').findOne({sourceId, status: 'active'})
}

async function getLastCompletedHarvest(sourceId) {
  return mongo.db.collection('harvests').findOne({sourceId, status: 'completed'}, {sort: {createdAt: -1}})
}

module.exports = {startHarvesting, finishHarvesting, getActiveHarvest, getLastCompletedHarvest}