#!/usr/bin/env node --max_old_space_size=8192
require('dotenv').config()
const {join} = require('path')
const {outputFile} = require('fs-extra')
const bluebird = require('bluebird')
const {groupBy} = require('lodash')
const chalk = require('chalk')
const {expandMetaWithResults} = require('./lib/meta')
const {computeList} = require('./lib/sources')
const {processSource} = require('./lib/processing')
const mongo = require('./lib/util/mongo')
const {endFarms} = require('./lib/util/farms')

async function main() {
  await mongo.connect()

  const sources = await computeList()

  await bluebird.map(sources, async source => {
    const {originalFile, rows, errored, report} = await processSource(source)

    await outputFile(join(__dirname, 'dist', `${source.meta.id}.csv`), originalFile)

    const communesRows = groupBy(
      rows,
      r => r.parsedValues.commune_insee || r.additionalValues?.cle_interop?.codeCommune || 'unknown'
    )

    const codesCommunes = Object.keys(communesRows)
      .filter(codeCommune => codeCommune !== 'unknown')
      .filter(codeCommune => communesRows[codeCommune].some(r => r.isValid))

    console.log(chalk.green(` * ${source.meta.title} (${source.meta.source}|${source.meta.model})`))
    console.log(chalk.gray(`    Adresses trouvées : ${rows.length}`))
    console.log(chalk.gray(`    Communes : ${codesCommunes.length}`))
    if (errored) {
      console.log(chalk.red(`    Lignes avec erreurs : ${errored}`))
    }

    expandMetaWithResults(source.meta, {rows, report, errored})

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
