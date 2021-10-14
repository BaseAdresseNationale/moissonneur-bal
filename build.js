#!/usr/bin/env node --max_old_space_size=8192
require('dotenv').config()
const {join} = require('path')
const {keyBy} = require('lodash')
const chalk = require('chalk')
const {outputFile} = require('fs-extra')
const bluebird = require('bluebird')
const {computeList} = require('./lib/sources')
const mongo = require('./lib/util/mongo')
const {endFarms} = require('./lib/util/farms')
const {gzip} = require('./lib/util/gzip')
const {fetchAllIfUpdated} = require('./lib/resources')
const convert = require('./lib/convert')

async function processSource(source) {
  try {
    // Téléchargement des ressources
    const flattenedResources = Object.keys(source.resources)
      .map(resourceName => ({name: resourceName, ...source.resources[resourceName]}))
    const fetchedResources = await fetchAllIfUpdated(flattenedResources)
    source.resources = keyBy(fetchedResources, 'name')

    // Conversion éventuelle des adresses au format BAL
    if (source.converter) {
      return await convert(source)
    }

    return {originalFile: source.resources.default.data}
  } catch (error) {
    console.log(chalk.red(`${source.meta.title} - Impossible d’accéder aux adresses`))
    console.log(error)
    return {}
  }
}

async function main() {
  await mongo.connect()

  const sources = await computeList()

  await bluebird.map(sources, async source => {
    const {originalFile} = await processSource(source)

    if (!originalFile) {
      return
    }

    await outputFile(
      join(__dirname, 'dist', `${source.meta.id}.csv.gz`),
      await gzip(originalFile)
    )
  }, {concurrency: 8})

  endFarms()
  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  endFarms()
  process.exit(1)
})
