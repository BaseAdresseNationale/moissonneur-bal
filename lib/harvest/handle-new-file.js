const hasha = require('hasha')
const {chain} = require('lodash')
const {validate} = require('@ban-team/validateur-bal')

const File = require('../models/file')

const {signData} = require('../util/signature')

const handleCommunesData = require('./handle-communes-data')

async function handleNewFile({sourceId, harvestId, newFile, newFileHash, currentFileId, currentFileHash, currentDataHash}) {
  if (!sourceId || !newFile) {
    throw new Error('handleNewFile must be called at least with sourceId and newFile parameters')
  }

  if (!newFileHash) {
    newFileHash = await hasha.async(newFile, {algorithm: 'sha256'})
  }

  if (currentFileHash && newFileHash === currentFileHash) {
    return {
      updateStatus: 'unchanged',
      fileId: currentFileId,
      fileHash: currentFileHash,
      dataHash: currentDataHash // On considère que le dataHash est inchangé
    }
  }

  const result = await validate(newFile, {relaxFieldsDetection: true})

  if (!result.parseOk) {
    const parseErrors = [...new Set(result.parseErrors.map(({code}) => code))]

    return {
      updateStatus: 'rejected',
      updateRejectionReason: `Impossible de lire le fichier CSV : ${parseErrors.join(', ')}`,
      fileHash: newFileHash // On garde fileHash mais on ne stocke pas le fichier problématique
    }
  }

  const validRows = result.rows.filter(r => r.isValid)
  const nbRows = result.rows.length
  const nbRowsWithErrors = result.rows.length - validRows.length
  const uniqueErrors = chain(result.rows).map('errors').flatten().filter(e => e.level === 'E').map('code').uniq().value()

  if (validRows.length / result.rows.length < 0.95) {
    return {
      updateStatus: 'rejected',
      updateRejectionReason: 'Le fichier contient trop d’erreurs de validation',
      fileHash: newFileHash,
      nbRows,
      nbRowsWithErrors,
      uniqueErrors
    }
  }

  const dataHash = signData(result.rows.map(r => r.rawValues))

  if (currentDataHash && currentDataHash === dataHash) {
    return {
      updateStatus: 'unchanged',
      fileId: currentFileId,
      fileHash: newFileHash,
      dataHash
    }
  }

  const timestamp = (new Date()).toISOString().replace(/[-:.]/g, '')
  const filename = `${sourceId}-${timestamp}.csv`
  const {_id} = await File.writeFile(newFile, filename, {
    sourceId,
    harvestId,
    fileHash: newFileHash,
    dataHash
  })

  const changes = await handleCommunesData({sourceId, harvestId, rows: result.rows})

  return {
    updateStatus: 'updated',
    fileId: _id,
    fileHash: newFileHash,
    dataHash,
    changes
  }
}

module.exports = handleNewFile
