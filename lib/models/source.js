const sub = require('date-fns/sub')
const mongo = require('../util/mongo')

const Harvest = require('./harvest')

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
          lastHarvestUpdateStatus: null,
          harvestingSince: null
        },
        data: {}
      }
    },
    {upsert: true}
  )
}

async function findSourcesToHarvest() {
  return mongo.db.collection('sources').find({
    _deleted: false,
    'harvesting.harvestingSince': null,
    'harvesting.lastHarvest': {$lt: sub(new Date(), {hours: 24})}
  }).toArray()
}

async function startHarvesting(sourceId) {
  const harvestDate = new Date()

  // On tente de basculer la source en cours de moissonnage
  const result = await mongo.db.collection('sources').updateOne(
    {_id: sourceId, _deleted: false, 'harvesting.harvestingSince': null},
    {$set: {
      'harvesting.harvestingSince': harvestDate,
    }}
  )

  // En cas d’échec on déclenche une erreur
  if (result.matchedCount === 0) {
    throw new Error(`Opération rejetée: impossible de déclencher le moissonnage de la source ${sourceId}`)
  }

  const harvest = await Harvest.startHarvesting(sourceId, harvestDate)
  return harvest
}

async function finishHarvesting(sourceId, changes) {
  const activeHarvest = await Harvest.getActiveHarvest(sourceId)

  if (!activeHarvest) {
    throw new Error(`Aucun moissonnage actif n’a été trouvé pour la source ${sourceId}`)
  }

  await Harvest.finishHarvesting(activeHarvest._id, changes)

  const changesForSource = {
    'harvesting.lastHarvest': activeHarvest.startedAt,
    'harvesting.harvestingSince': null,
    'harvesting.lastHarvestStatus': changes.status,
    'harvesting.lastHarvestUpdateStatus': changes.updateStatus
  }

  if (changes.updateStatus === 'updated') {
    changesForSource['data.fileId'] = changes.fileId
    changesForSource['data.fileHash'] = changes.fileHash
    changesForSource['data.harvestId'] = activeHarvest._id
    changesForSource['data.harvestDate'] = activeHarvest.startedAt
  }

  await mongo.db.collection('sources').updateOne(
    {_id: sourceId},
    {$set: changesForSource}
  )
}

async function writeFile(sourceId, file) {
  const timestamp = (new Date()).toISOString().replace(/[-:.]/g, '')
  const filename = `${sourceId}-${timestamp}.csv`
  return mongo.writeFileBuffer(file, filename, {sourceId})
}

async function cleanStalledHarvest() {
  await mongo.db.collection('sources').updateMany(
    {'harvesting.harvestingSince': {$lt: sub(new Date(), {minutes: 30})}},
    {$set: {'harvesting.harvestingSince': null}}
  )

  await Harvest.cleanStalledHarvest()
}

module.exports = {
  setOthersAsDeleted,
  upsert,
  findSourcesToHarvest,
  startHarvesting,
  finishHarvesting,
  writeFile,
  cleanStalledHarvest
}
