const sub = require('date-fns/sub')
const mongo = require('../util/mongo')

async function getHarvest(harvestId) {
  return mongo.db.collection('harvests').findOne({_id: harvestId})
}

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

async function cleanStalledHarvests() {
  return mongo.db.collection('harvests').deleteMany(
    {status: 'active', startedAt: {$lt: sub(new Date(), {minutes: 30})}}
  )
}

async function getLatestHarvests(sourceId) {
  return mongo.db.collection('harvests').find({sourceId, status: 'completed'}, {sort: {finishedAt: -1}}).limit(10).toArray()
}

module.exports = {
  getHarvest,
  startHarvesting,
  finishHarvesting,
  getActiveHarvest,
  getLastCompletedHarvest,
  cleanStalledHarvests,
  getLatestHarvests
}
