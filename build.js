#!/usr/bin/env node --max_old_space_size=8192
require('dotenv').config()
const {join} = require('path')
const {outputFile} = require('fs-extra')
const bluebird = require('bluebird')
const {groupBy} = require('lodash')
const {computeList} = require('./lib/sources')
const {processSource} = require('./lib/processing')
const mongo = require('./lib/util/mongo')
const {endFarms} = require('./lib/util/farms')
const {writeCsv} = require('./lib/util/csv')

async function main() {
  await mongo.connect()

  const sources = await computeList()

  await bluebird.map(sources, async source => {
    const {originalFile, rows} = await processSource(source)

    const datasetPath = join(__dirname, 'dist', source.meta.id)

    await outputFile(join(datasetPath, 'original.csv'), originalFile)

    const communesRows = groupBy(
      rows,
      r => r.parsedValues.commune_insee || r.additionalValues?.cle_interop?.codeCommune || 'unknown'
    )

    await bluebird.map(Object.keys(communesRows), async key => {
      await writeCsv(
        join(datasetPath, `${key}.csv.gz`),
        communesRows[key].map(r => r.rawValues)
      )
    }, {concurrency: 4})

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
