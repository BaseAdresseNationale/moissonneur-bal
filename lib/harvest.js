const {keyBy} = require('lodash')
const hasha = require('hasha')
const chalk = require('chalk')
const {validate} = require('@ban-team/validateur-bal')
const {groupBy} = require('lodash')
const Papa = require('papaparse')

const {fetchAllIfUpdated, fetchIfUpdated, resourceToArtefact} = require('./resources')
const {convert, getResourcesDefinitions} = require('./convert')

const Source = require('./models/source')
const Harvest = require('./models/harvest')
const Revision = require('./models/revision')

const {getNbErrors, getErrorPercentage} = require('./util/validate-file')
const {sendMessage} = require('./util/slack')
const {signData} = require('./util/signature')

async function getRevisionChanges(sourceId, codeCommune, data, currentRevision) {
  const currentFileHash = currentRevision?.fileHash
  const currentDataHash = currentRevision?.dataHash
  const currentFileId = currentRevision?.fileId

  const rawValues = data.map(d => d.rawValues)
  const nbRows = rawValues.length
  const nbRowsWithErrors = getNbErrors(data.map(d => d))

  const dataHash = signData(rawValues)
  const csvFile = Papa.unparse(rawValues)
  const file = Buffer.from(csvFile)
  const newFileHash = hasha(file, {algorithm: 'sha256'})

  if (currentFileHash && newFileHash === currentFileHash) {
    return {
      updateStatus: 'unchanged',
      fileId: currentFileId,
      fileHash: currentFileHash,
      dataHash: currentDataHash
    }
  }

  if (currentDataHash && currentDataHash === dataHash) {
    return {
      updateStatus: 'unchanged',
      fileId: currentFileId,
      fileHash: newFileHash,
      dataHash
    }
  }

  const {_id} = await Source.writeFile(sourceId, file, newFileHash, dataHash)

  return {
    fileId: _id,
    sourceId,
    codeCommune,
    updateStatus: 'updated',
    fileHash: newFileHash,
    dataHash,
    nbRows,
    nbRowsWithErrors
  }
}

async function handleCommunesRevisions(sourceId, data) {
  const rows = data.rows.map(r => r)
  const groupedByCommunes = groupBy(rows, row => {
    if (row.parsedValues.commune_insee) {
      return row.parsedValues.commune_insee
    }

    if (row.additionalValues.cle_interop) {
      return row.additionalValues.cle_interop.codeCommune
    }

    return 'not-found'
  })

  await Promise.all(
    Object.keys(groupedByCommunes).map(async codeCommune => {
      const currentRevision = await Revision.getRevisionByCommune(codeCommune)
      const revisionChanges = await getRevisionChanges(
        sourceId,
        codeCommune,
        groupedByCommunes[codeCommune],
        currentRevision
      )
      await (currentRevision ? Revision.update(currentRevision._id, revisionChanges) : Revision.create(revisionChanges))
    })
  )
}

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

  const {_id} = await Source.writeFile(sourceId, newFile, newFileHash, dataHash)

  await handleCommunesRevisions(sourceId, result)

  return {
    updateStatus: 'updated',
    fileId: _id,
    fileHash: newFileHash,
    dataHash
  }
}

async function fetchIfUpdatedAndConvert(source, indexedFetchArtefacts) {
  const {converter} = source

  const resourcesDefinitions = getResourcesDefinitions(converter)

  const flattenedResources = Object.keys(resourcesDefinitions)
    .map(resourceName => {
      const resourceDefinition = resourcesDefinitions[resourceName]
      const relatedFetchArtefact = indexedFetchArtefacts[resourceDefinition.url] || {}

      return {
        name: resourceName,
        ...relatedFetchArtefact,
        ...resourceDefinition
      }
    })
  const fetchedResources = await fetchAllIfUpdated(flattenedResources)

  if (fetchedResources.some(r => r.data)) {
    const convertedFile = await convert(converter, keyBy(fetchedResources, 'name'))
    return {
      fetchArtefacts: fetchedResources.map(r => resourceToArtefact(r)),
      convertedFile
    }
  }

  return {
    fetchArtefacts: fetchedResources.map(r => resourceToArtefact(r))
  }
}

async function processSource(source) {
  const lastCompletedHarvest = await Harvest.getLastCompletedHarvest(source._id)
  const {fetchArtefacts: previousFetchArtefacts, fileId, fileHash, dataHash} = lastCompletedHarvest || {}
  const indexedFetchArtefacts = keyBy(previousFetchArtefacts, 'url')

  const result = {}
  let newFile
  let newFileHash

  try {
    if (source.converter) {
      const {convertedFile, fetchArtefacts} = await fetchIfUpdatedAndConvert(source, indexedFetchArtefacts)
      result.fetchArtefacts = fetchArtefacts
      newFile = convertedFile
    } else {
      const relatedFetchArtefact = indexedFetchArtefacts[source.url] || {}
      const resource = await fetchIfUpdated({...relatedFetchArtefact, url: source.url})

      result.fetchArtefacts = [resourceToArtefact(resource)]
      newFile = resource.data
      newFileHash = resource.hash
    }

    if (newFile) {
      const handleNewFileResult = await handleNewFile({
        sourceId: source._id,
        newFile,
        newFileHash,
        currentFileId: fileId,
        currentFileHash: fileHash,
        currentDataHash: dataHash
      })
      Object.assign(result, handleNewFileResult)
    } else {
      Object.assign(result, {updateStatus: 'unchanged', fileId, fileHash})
    }

    return result
  } catch (error) {
    console.log(chalk.red(`${source.title} - Impossible d’accéder aux adresses`))
    console.log(error.message)
    return {error: error.message}
  }
}

async function harvestSource(sourceId) {
  const source = await Source.getSource(sourceId)
  await Source.startHarvesting(source._id)

  const {fetchArtefacts, updateStatus, updateRejectionReason, fileId, fileHash, dataHash, error} = await processSource(source)

  if (error) {
    await Source.finishHarvesting(source._id, {status: 'failed', error})
    return
  }

  if (updateStatus === 'updated') {
    const message = `Mise à jour d’une Base Adresse Locale : *${source.title}*
_Moissonnage via ${source.type} :tractor:_`
    await sendMessage(message)
  }

  await Source.finishHarvesting(source._id, {
    status: 'completed',
    fetchArtefacts,
    updateStatus,
    updateRejectionReason,
    fileId,
    fileHash,
    dataHash
  })
}

module.exports = {harvestSource}
