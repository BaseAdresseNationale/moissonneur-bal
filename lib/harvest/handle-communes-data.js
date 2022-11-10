const {keyBy, groupBy, countBy, chain} = require('lodash')
const pMap = require('p-map')
const Papa = require('papaparse')
const {signData} = require('../util/signature')
const Revision = require('../models/revision')
const File = require('../models/file')
const publishBal = require('./publish-bal')

function getCodeCommune(row) {
  return row.parsedValues.commune_insee || row.additionalValues.cle_interop?.codeCommune
}

async function handleCommuneData({codeCommune, currentRevision, sourceId, harvestId, rows}) {
  const validRows = rows.filter(r => r.isValid)

  const nbRows = rows.length
  const nbRowsWithErrors = rows.length - validRows.length
  const uniqueErrors = chain(rows).map('errors').flatten().filter(e => e.level === 'E').map('code').uniq().value()

  const newRevision = {
    sourceId,
    codeCommune,
    harvestId,
    nbRows,
    nbRowsWithErrors,
    uniqueErrors
  }

  if (validRows.length / rows.length < 0.95) {
    newRevision.updateStatus = 'rejected'
    newRevision.updateRejectionReason = 'Le fichier contient trop d’erreurs de validation'
    return Revision.createRevision(newRevision)
  }

  const dataHash = signData(rows.map(r => r.rawValues))

  if (currentRevision && currentRevision.dataHash === dataHash) {
    newRevision.updateStatus = 'unchanged'
    newRevision.fileId = currentRevision.fileId
    newRevision.dataHash = dataHash
    return Revision.createRevision(newRevision)
  }

  const csvData = Papa.unparse(rows.map(r => r.rawValues), {delimiter: ';'})
  const file = Buffer.from(csvData)
  const timestamp = (new Date()).toISOString().replace(/[-:.]/g, '')
  const filename = `${sourceId}-${codeCommune}-${timestamp}.csv`

  const {_id: fileId} = await File.writeFile(file, filename, {
    sourceId,
    harvestId,
    codeCommune,
    dataHash
  })

  newRevision.updateStatus = 'updated'
  newRevision.fileId = fileId
  newRevision.dataHash = dataHash

  try {
    newRevision.publication = await publishBal({
      sourceId,
      codeCommune,
      harvestId,
      nbRows,
      nbRowsWithErrors,
      validRows,
      uniqueErrors
    })
  } catch (error) {
    newRevision.publication = {status: 'error', errorMessage: error.message}
  }

  return Revision.createRevision(newRevision)
}

async function handleCommunesData({sourceId, harvestId, rows}) {
  const currentRevisions = await Revision.getCurrentRevisions(sourceId)
  const currentRevisionsIndex = keyBy(currentRevisions, 'codeCommune')

  const validRows = rows.filter(r => r.isValid)
  const codesCommunes = [...new Set(validRows.map(r => getCodeCommune(r)))]
  const rowsWithCodeCommune = rows.filter(r => getCodeCommune(r))
  const rowsGroups = groupBy(rowsWithCodeCommune, r => getCodeCommune(r))

  const communesRevisions = await pMap(
    codesCommunes,
    codeCommune => handleCommuneData({
      codeCommune,
      currentRevision: currentRevisionsIndex[codeCommune],
      sourceId,
      harvestId,
      rows: rowsGroups[codeCommune]
    }),
    {concurrency: 4}
  )

  return countBy(communesRevisions, 'updateStatus')
}

module.exports = handleCommunesData
