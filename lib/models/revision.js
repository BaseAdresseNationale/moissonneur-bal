const createError = require('http-errors')
const {validate} = require('@ban-team/validateur-bal')

const mongo = require('../util/mongo')
const File = require('../models/file')
const publishBal = require('../harvest/publish-bal')

const Source = require('./source')

function getCurrentRevisions(sourceId) {
  return mongo.db.collection('revisions').find({sourceId, current: true}).toArray()
}

function getRevisions(harvestId) {
  return mongo.db.collection('revisions').find({harvestId}).toArray()
}

function getRevision(revisionId) {
  return mongo.db.collection('revisions').findOne({_id: revisionId})
}

function getRevisionByCodeCommune(codeCommune) {
  return mongo.db.collection('revisions').find({codeCommune}).toArray()
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

async function publish(revision, options = {}) {
  const {sourceId, codeCommune, harvestId, nbRows, nbRowsWithErrors, uniqueErrors, fileId, current} = revision
  const publication = revision.publication || {}
  const source = await Source.getSource(sourceId)

  if (!current) {
    throw createError(409, 'La révision n’est pas la révision courante pour cette commune')
  }

  if (!options.force && !['published', 'provided-by-other-client', 'provided-by-other-source'].includes(publication.status)) {
    throw createError(409, 'La révision ne peut pas être publiée')
  }

  if (!source) {
    throw createError(409, 'La source associée n’existe plus')
  }

  if (!source.enabled) {
    throw createError(409, 'La source associée n’est plus active')
  }

  if (source._deleted) {
    throw createError(409, 'La source associée a été supprimée')
  }

  let file = null
  try {
    file = await File.getFile(fileId)
  } catch {
    throw createError(409, 'Le fichier BAL associé n’est plus disponible')
  }

  const result = await validate(file.data, {profile: '1.3-etalab', relaxFieldsDetection: true})

  if (!result.parseOk || result.rows.length !== nbRows) {
    throw createError(409, 'Problème de cohérence des données : investigation nécessaire')
  }

  const validRows = result.rows.filter(r => r.isValid)
  const organizationName = source.organization?.name

  const publicationResult = await publishBal({
    sourceId,
    codeCommune,
    harvestId,
    nbRows,
    nbRowsWithErrors,
    validRows,
    uniqueErrors,
    organizationName
  }, options)

  const {value} = await mongo.db.collection('revisions').findOneAndUpdate(
    {_id: revision._id},
    {$set: {publication: publicationResult}},
    {returnDocument: 'after'}
  )

  return value
}

module.exports = {getCurrentRevisions, createRevision, getRevisions, getRevision, publish, getRevisionByCodeCommune}
