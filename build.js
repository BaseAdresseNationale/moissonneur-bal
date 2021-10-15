#!/usr/bin/env node --max_old_space_size=8192
require('dotenv').config()
const {join} = require('path')
const {keyBy, omit} = require('lodash')
const chalk = require('chalk')
const {outputFile} = require('fs-extra')
const bluebird = require('bluebird')

const mongo = require('./lib/util/mongo')
const {endFarms} = require('./lib/util/farms')
const {gzip} = require('./lib/util/gzip')

const {computeList} = require('./lib/sources')
const {fetchAllIfUpdated, fetchIfUpdated} = require('./lib/resources')
const {convert, getResourcesDefinitions} = require('./lib/convert')

const Source = require('./lib/models/source')
const Harvest = require('./lib/models/harvest')

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
      fetchArtefacts: fetchedResources.map(r => omit(r, 'data')),
      updateStatus: 'updated',
      newFile: convertedFile
    }
  }

  return {
    fetchArtefacts: fetchedResources,
    updateStatus: 'unchanged'
  }
}

async function processSource(source) {
  const lastCompletedHarvest = await Harvest.getLastCompletedHarvest(source._id)
  const {fetchArtefacts: previousFetchArtefacts} = lastCompletedHarvest || {}
  const indexedFetchArtefacts = keyBy(previousFetchArtefacts, 'url')

  try {
    if (source.converter) {
      return await fetchIfUpdatedAndConvert(source, indexedFetchArtefacts)
    }

    const relatedFetchArtefact = indexedFetchArtefacts[source.url] || {}
    const resource = await fetchIfUpdated({...relatedFetchArtefact, url: source.url})

    return {
      fetchArtefacts: [omit(resource, 'data')],
      updateStatus: resource.data ? 'updated' : 'unchanged',
      newFile: resource.data || undefined
    }
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

  const sourcesToHarvest = await Source.findSourcesToHarvest()
  console.log(`${sourcesToHarvest.length} sources à moissonner`)

  await bluebird.map(sourcesToHarvest, async source => {
    await Source.startHarvesting(source._id)

    const {fetchArtefacts, updateStatus, newFile, error} = await processSource(source)

    if (error) {
      await Source.finishHarvesting(source._id, {status: 'failed', error})
      return
    }

    if (newFile) {
      await outputFile(
        join(__dirname, 'dist', `${source._id}.csv.gz`),
        await gzip(newFile)
      )
    }

    await Source.finishHarvesting(source._id, {status: 'completed', fetchArtefacts, updateStatus})
  }, {concurrency: 8})

  endFarms()
  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  endFarms()
  process.exit(1)
})
