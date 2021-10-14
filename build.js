#!/usr/bin/env node --max_old_space_size=8192
require('dotenv').config()
const {join} = require('path')
const {outputFile} = require('fs-extra')
const bluebird = require('bluebird')
const {computeList} = require('./lib/sources')
const {processSource} = require('./lib/processing')
const mongo = require('./lib/util/mongo')
const {endFarms} = require('./lib/util/farms')

async function main() {
  await mongo.connect()

  const sources = await computeList()

  await bluebird.map(sources, async source => {
    const {originalFile} = await processSource(source)

    const datasetPath = join(__dirname, 'dist', source.meta.id)

    await outputFile(join(datasetPath, 'original.csv'), originalFile)

    return source.meta
  }, {concurrency: 8})

  endFarms()
  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  endFarms()
  process.exit(1)
})
