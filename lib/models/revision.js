const mongo = require('../util/mongo')

function getCurrentRevisions(sourceId) {
  return mongo.db.collection('revisions').find({sourceId, current: true}).toArray()
}

function getRevisions(harvestId) {
  return mongo.db.collection('revisions').find({harvestId}).toArray()
}

async function createRevision({sourceId, codeCommune, harvestId, updateStatus, updateRejectionReason, fileId, dataHash, nbRows, nbRowsWithErrors, uniqueErrors, publication}) {
  const newRevision = {
    sourceId,
    codeCommune,
    harvestId,
    updateStatus,
    updateRejectionReason,
    fileId,
    dataHash,
    nbRows,
    nbRowsWithErrors,
    uniqueErrors,
    publication,
    current: ['updated', 'unchanged'].includes(updateStatus)
  }

  if (newRevision.current) {
    await mongo.db.collection('revisions').bulkWrite([
      {updateMany: {filter: {sourceId, codeCommune}, update: {$set: {current: false}}}},
      {insertOne: {document: newRevision}}
    ])
  } else {
    await mongo.db.collection('revisions').insertOne(newRevision)
  }

  return newRevision
}

module.exports = {getCurrentRevisions, createRevision, getRevisions}
