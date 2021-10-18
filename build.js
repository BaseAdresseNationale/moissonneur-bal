#!/usr/bin/env node --max_old_space_size=8192
require('dotenv').config()
const {keyBy} = require('lodash')
const hasha = require('hasha')
const chalk = require('chalk')
const bluebird = require('bluebird')

const mongo = require('./lib/util/mongo')
const {endFarms} = require('./lib/util/farms')

const {computeList} = require('./lib/sources')
const {fetchAllIfUpdated, fetchIfUpdated, resourceToArtefact} = require('./lib/resources')
const {convert, getResourcesDefinitions} = require('./lib/convert')

const Source = require('./lib/models/source')
const Harvest = require('./lib/models/harvest')

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

async function updateSources() {
  const sources = await computeList()
  await Promise.all(sources.map(async source => Source.upsert(source)))
  await Source.setOthersAsDeleted(sources.map(s => s._id))
}

async function main() {
  await mongo.connect()

  await updateSources()
  await Source.cleanStalledHarvest()

  const sourcesToHarvest = await Source.findSourcesToHarvest()
  console.log(`${sourcesToHarvest.length} sources à moissonner`)

  await bluebird.map(sourcesToHarvest, async source => {
    await Source.startHarvesting(source._id)

    const {fetchArtefacts, updateStatus, fileId, fileHash, error} = await processSource(source)

    if (error) {
      await Source.finishHarvesting(source._id, {status: 'failed', error})
      return
    }

    await Source.finishHarvesting(source._id, {
      status: 'completed',
      fetchArtefacts,
      updateStatus,
      fileId,
      fileHash
    })
  }, {concurrency: 8})

  endFarms()
  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  endFarms()
  process.exit(1)
})
