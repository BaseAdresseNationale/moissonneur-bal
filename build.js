#!/usr/bin/env node --max_old_space_size=8192
require('dotenv').config()
const {join} = require('path')
const {emptyDir} = require('fs-extra')
const Keyv = require('keyv')
const bluebird = require('bluebird')
const {uniq} = require('lodash')
const chalk = require('chalk')
const {extractAsTree} = require('@etalab/bal')
const {computeMetaFromSource, expandMetaWithResults} = require('./lib/meta')
const {getCommune} = require('./lib/cog')
const {createCsvFilesWriter} = require('./lib/csv')
const {computeList} = require('./lib/sources')
const importData = require('./lib/import-data')
const {endFarms} = require('./lib/farms')

const db = new Keyv('sqlite://bal.sqlite')
const distPath = join(__dirname, 'dist')

async function main() {
  const sources = await computeList()
  const globalCommunes = new Set()
  let adressesCount = 0
  let erroredAdressesCount = 0

  await emptyDir(distPath)
  const csvFiles = createCsvFilesWriter(distPath)

  await db.clear()

  const datasets = await bluebird.mapSeries(sources, async source => {
    const meta = computeMetaFromSource(source)
    console.log(chalk.green(` * ${meta.title} (${meta.model})`))
    const {data, errored, report} = await importData(source)
    data.forEach(r => {
      r.licence = meta.license
    })
    const codesCommunes = uniq(data.map(c => c.codeCommune))
    console.log(chalk.gray(`    Adresses trouvées : ${data.length}`))
    console.log(chalk.gray(`    Communes : ${codesCommunes.length}`))
    if (errored) {
      console.log(chalk.red(`    Lignes avec erreurs : ${errored}`))
      erroredAdressesCount += errored
    }

    const tree = extractAsTree(data)
    expandMetaWithResults(meta, {tree, report, errored})
    await db.set(`${meta.id}-data`, tree)
    if (report) {
      await db.set(`${meta.id}-report`, report)
    }

    data.forEach(r => csvFiles.writeRow(r))
    adressesCount += data.length
    codesCommunes.forEach(c => globalCommunes.add(c))
    return meta
  })

  await db.set('datasets', datasets)

  await csvFiles.finish()

  /* Compute and display metrics */

  console.log(`${globalCommunes.size} communes couvertes !`)
  console.log(`Adresses acceptées : ${adressesCount}`)
  console.log(`Adresses avec erreurs : ${erroredAdressesCount}`)

  const populationCount = [...globalCommunes].reduce((acc, codeCommune) => {
    const commune = getCommune(codeCommune)
    if (commune && commune.population) {
      return acc + commune.population
    }

    return acc
  }, 0)

  console.log(`Population couverte : ${populationCount}`)

  endFarms()
}

main().catch(error => {
  console.error(error)
  endFarms()
  process.exit(1)
})
