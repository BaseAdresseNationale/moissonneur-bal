const {keyBy} = require('lodash')
const hasha = require('hasha')
const chalk = require('chalk')
const bluebird = require('bluebird')

const {fetchAllIfUpdated, fetchIfUpdated, resourceToArtefact} = require('../resources')
const {convert, getResourcesDefinitions} = require('../convert')

const Source = require('../models/source')
const Harvest = require('../models/harvest')
const {sendMessage} = require('../util/slack')

async function handleNewFile({sourceId, newFile, newFileHash, currentFileId, currentFileHash}) {
  if (!sourceId || !newFile) {
    throw new Error('handleNewFile must be called at least with sourceId and newFile parameters')
  }

  if (!newFileHash) {
    newFileHash = await hasha.async(newFile, {algorithm: 'sha256'})
  }

  if (currentFileHash && newFileHash === currentFileHash) {
    return {updateStatus: 'unchanged', fileId: currentFileId, fileHash: currentFileHash}
  }

  const {_id} = await Source.writeFile(sourceId, newFile, newFileHash)

  return {updateStatus: 'updated', fileId: _id, fileHash: newFileHash}
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
  const {fetchArtefacts: previousFetchArtefacts, fileId, fileHash} = lastCompletedHarvest || {}
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
        currentFileHash: fileHash
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

async function cleanStalledHarvest() {
  await Source.cleanStalledHarvest()
}

async function harvestAskedToFalse(sources) {
  await Promise.all(sources.map(async source => Source.setHarvestAskedToFalse(source._id)))
}

async function harvestNewOrOutdated(sources = null) {
  if (sources) {
    await harvestAskedToFalse(sources)
  }

  const sourcesToHarvest = sources || await Source.findSourcesToHarvest()
  console.log(`${sourcesToHarvest.length} sources à moissonner`)

  await bluebird.map(sourcesToHarvest, async source => {
    await Source.startHarvesting(source._id)

    const {fetchArtefacts, updateStatus, fileId, fileHash, error} = await processSource(source)

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
      fileId,
      fileHash
    })
  }, {concurrency: 8})
}

async function runWorkflow() {
  console.log('Nettoyage des moissonnage bloqués…')
  await cleanStalledHarvest()
  console.log('OK!')

  console.log('Moissonnage des sources nouvelles et obsolètes')
  await harvestNewOrOutdated()
  console.log('OK!')
}

module.exports = {runWorkflow, harvestNewOrOutdated}
