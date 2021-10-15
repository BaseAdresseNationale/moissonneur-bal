#!/usr/bin/env node --max_old_space_size=8192
require('dotenv').config()
const {join} = require('path')
const {keyBy} = require('lodash')
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

async function fetchIfUpdatedAndConvert(source) {
  const {converter} = source
  // Téléchargement des ressources
  const resourcesDefinitions = getResourcesDefinitions(converter)
  const flattenedResources = Object.keys(resourcesDefinitions)
    .map(resourceName => ({name: resourceName, ...resourcesDefinitions[resourceName]}))
  const fetchedResources = await fetchAllIfUpdated(flattenedResources)
  return convert(converter, keyBy(fetchedResources, 'name'))
}

async function processSource(source) {
  try {
    if (source.converter) {
      return await fetchIfUpdatedAndConvert(source)
    }

    const resource = await fetchIfUpdated({url: source.url})
    return {originalFile: resource.data}
  } catch (error) {
    console.log(chalk.red(`${source.title} - Impossible d’accéder aux adresses`))
    console.log(error.message)
    return {}
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
    const harvestDate = new Date()
    const {originalFile} = await processSource(source)

    if (!originalFile) {
      await Source.finishedHarvesting(source._id, harvestDate, 'unavailable')
      return
    }

    await outputFile(
      join(__dirname, 'dist', `${source._id}.csv.gz`),
      await gzip(originalFile)
    )

    await Source.finishedHarvesting(source._id, harvestDate, 'completed')
  }, {concurrency: 8})

  endFarms()
  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  endFarms()
  process.exit(1)
})
