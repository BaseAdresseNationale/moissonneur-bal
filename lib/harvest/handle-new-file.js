const hasha = require('hasha')
const {validate} = require('@ban-team/validateur-bal')

const File = require('../models/file')

const {getErrorPercentage} = require('../util/validate-file')
const {signData} = require('../util/signature')

async function handleNewFile({sourceId, newFile, newFileHash, currentFileId, currentFileHash, currentDataHash}) {
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
    return {
      updateStatus: 'rejected',
      updateRejectionReason: `Unable to parse CSV file: ${result.parseErrors.join(', ')}`,
      fileHash: newFileHash // On garde fileHash mais on ne stocke pas le fichier problématique
    }
  }

  const percentageError = getErrorPercentage(result)

  if (percentageError > 5) {
    return {
      updateStatus: 'rejected',
      updateRejectionReason: `Too many validation errors in the CSV file: ${percentageError.toFixed(1)}%. Limit < 5%.`,
      fileHash: newFileHash
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
    fileHash: newFileHash,
    dataHash
  })

  return {
    updateStatus: 'updated',
    fileId: _id,
    fileHash: newFileHash,
    dataHash
  }
}

module.exports = handleNewFile
