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

async function finishHarvesting(harvestId, status) {
  return mongo.db.collection('harvests').findOneAndUpdate(
    {_id: harvestId},
    {$set: {status, finishedAt: new Date()}},
    {returnDocument: 'after'}
  )
}

async function getActiveHarvest(sourceId) {
  return mongo.db.collection('harvests').findOne({sourceId, status: 'active'})
}

module.exports = {startHarvesting, finishHarvesting, getActiveHarvest}
