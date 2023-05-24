const createError = require('http-errors')
const sub = require('date-fns/sub')
const mongo = require('../util/mongo')

function parseQueryLimitOffset(query) {
  const limit = query.limit ? Number.parseInt(query.limit, 10) : 20
  const offset = query.offset ? Number.parseInt(query.offset, 10) : 0

  if (!Number.isInteger(limit) || limit > 100 || limit <= 0) {
    throw createError(400, 'La valeur du champ "limit" doit un entier compris en 1 et 100 (défaut : 20)')
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw createError(400, 'La valeur du champ "offset" doit être un entier positif (défaut : 0)')
  }

  return {offset, limit}
}

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

async function getHarvests(sourceId, query) {
  const {limit, offset} = parseQueryLimitOffset(query)
  const count = await mongo.db.collection('harvests').countDocuments({sourceId})
  const results = await mongo.db.collection('harvests')
    .find({sourceId}, {sort: {finishedAt: -1}})
    .limit(Number(limit))
    .skip(Number(offset))
    .toArray()

  return {
    offset,
    limit,
    count,
    results
  }
}

module.exports = {
  getHarvest,
  startHarvesting,
  finishHarvesting,
  getActiveHarvest,
  getLastCompletedHarvest,
  cleanStalledHarvests,
  getHarvests
}
