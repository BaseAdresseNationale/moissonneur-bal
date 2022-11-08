const mongo = require('../util/mongo')

function getCurrentRevisions(sourceId) {
  return mongo.collection('revisions').find({sourceId, current: true})
}

async function createRevision({sourceId, codeCommune, harvestId, updateStatus, updateRejectionReason, fileId, dataHash, nbRows, nbRowsWithErrors}) {
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
    current: ['updated', 'unchanged'].includes(updateStatus)
  }

  if (newRevision.current) {
    await mongo.collection('revisions').bulkWrite([
      {updateMany: {filter: {sourceId, codeCommune}, update: {$set: {current: false}}}},
      {insertOne: {document: newRevision}}
    ])
  } else {
    await mongo.collection('revisions').insertOne(newRevision)
  }

  return newRevision
}

module.exports = {getCurrentRevisions, createRevision}
