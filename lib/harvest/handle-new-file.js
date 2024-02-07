const {validate} = require('@ban-team/validateur-bal')

const File = require('../models/file')

const {signData} = require('../util/signature')
const {communeIsInPerimeters} = require('../util/perimeters')

const handleCommunesData = require('./handle-communes-data')

const MAX_ALLOWED_FILE_SIZE = 100_000_000

const UpdateStatus = {
  Rejected: 'rejected',
  Updated: 'updated',
  Unchanged: 'unchanged',
}

async function handleNewFile(activeHarvest, file, lastCompletedHarvest, organization) {
  const {_id: harvestId, sourceId} = activeHarvest
  const {data: newFile, hash: newFileHash} = file
  const {
    fileId: currentFileId,
    fileHash: currentFileHash,
    dataHash: currentDataHash,
  } = lastCompletedHarvest
  const {perimeters, name: organizationName} = organization

  if (!sourceId || !newFile) {
    throw new Error('handleNewFile must be called at least with sourceId and newFile parameters')
  }

  if (newFile.length > MAX_ALLOWED_FILE_SIZE) {
    return {
      updateStatus: UpdateStatus.Rejected,
      updateRejectionReason: 'Fichier trop volumineux',
      fileHash: newFileHash,
    }
  }

  const result = await validate(newFile, {profile: '1.3-relax'})

  if (!result.parseOk) {
    const parseErrors = [...new Set(result.parseErrors.map(({code}) => code))]

    return {
      updateStatus: UpdateStatus.Rejected,
      updateRejectionReason: `Impossible de lire le fichier CSV : ${parseErrors.join(', ')}`,
      fileHash: newFileHash, // On garde fileHash mais on ne stocke pas le fichier problématique
    }
  }

  const validRows = result.rows.filter(r => r.isValid)
  if (validRows.length / result.rows.length < 0.95) {
    return {
      updateStatus: UpdateStatus.Rejected,
      updateRejectionReason: 'Le fichier contient trop d’erreurs de validation',
      fileHash: newFileHash,
    }
  }

  // CHECK PERIMETER
  const codesCommunes = [...new Set(validRows.map(r => r.parsedValues.commune_insee))]
  const communeOutOfPerimeters = codesCommunes
    .filter(codeCommune => !communeIsInPerimeters(codeCommune, perimeters || []))

  if (communeOutOfPerimeters.length > 0) {
    return {
      updateStatus: UpdateStatus.Rejected,
      updateRejectionReason: `Les codes commune ${communeOutOfPerimeters.join(', ')} sont en dehors du périmètre`,
    }
  }

  if (currentFileHash && newFileHash === currentFileHash) {
    return {
      updateStatus: UpdateStatus.Unchanged,
      fileId: currentFileId,
      fileHash: currentFileHash,
      dataHash: currentDataHash, // On considère que le dataHash est inchangé
    }
  }

  const dataHash = signData(result.rows.map(r => r.rawValues))
  if (currentDataHash && currentDataHash === dataHash) {
    return {
      updateStatus: UpdateStatus.Unchanged,
      fileId: currentFileId,
      fileHash: newFileHash,
      dataHash,
    }
  }

  const timestamp = (new Date()).toISOString().replace(/[-:.]/g, '')
  const filename = `${sourceId}-${timestamp}.csv`
  const {_id: newFileId} = await File.writeFile(newFile, filename, {
    sourceId,
    harvestId,
    fileHash: newFileHash,
    dataHash
  })

  await handleCommunesData({sourceId, harvestId, rows: result.rows, organizationName})

  return {
    updateStatus: UpdateStatus.Updated,
    fileId: newFileId,
    fileHash: newFileHash,
    dataHash,
  }
}

module.exports = {
  handleNewFile
}
