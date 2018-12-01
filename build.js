#!/usr/bin/env node --max_old_space_size=8192
require('dotenv').config()
const {promisify} = require('util')
const Keyv = require('keyv')
const bluebird = require('bluebird')
const {uniq} = require('lodash')
const chalk = require('chalk')
const {featureCollection} = require('@turf/turf')
const writeJsonFile = require('write-json-file')
const finished = promisify(require('end-of-stream'))
const {extractAsTree} = require('@etalab/bal')
const {createFeature} = require('./lib/meta')
const {loadPopulation} = require('./lib/population')
const {createCSVWriteStream} = require('./lib/csv')
const {computeList} = require('./lib/sources')
const importData = require('./lib/import-data')

const db = new Keyv('sqlite://bal.sqlite')

function computeMeta(entry) {
  const odbl = Boolean(entry.odbl || (entry.dataset && entry.dataset.license === 'odc-odbl'))
  const name = entry.name || entry.dataset.title
  const model = entry.importer ? 'custom' : 'bal-aitf'
  const homepage = entry.homepage || entry.dataset.page
  const id = entry.slug || entry.dataset.id
  return {id, name, homepage, model, odbl}
}

async function main() {
  const population = await loadPopulation()
  const sources = await computeList()
  const globalCommunes = new Set()
  let adressesCount = 0
  let erroredAdressesCount = 0
  const features = []

  const csvFile = createCSVWriteStream('adresses-locales.csv')

  await db.clear()

  await bluebird.mapSeries(sources, async source => {
    const meta = computeMeta(source)
    console.log(chalk.green(` * ${meta.name} (${meta.model})`))
    const {data, errored, report} = await importData(source)
    const codesCommunes = uniq(data.map(c => c.codeCommune))
    console.log(chalk.gray(`    Adresses trouvées : ${data.length}`))
    console.log(chalk.gray(`    Communes : ${codesCommunes.length}`))
    if (errored) {
      console.log(chalk.red(`    Lignes avec erreurs : ${errored}`))
      erroredAdressesCount += errored
    }
    const tree = extractAsTree(data)
    await db.set(`${meta.id}-data`, tree)
    if (report) {
      await db.set(`${meta.id}-report`, report)
    }
    data.forEach(r => csvFile.write(r))
    adressesCount += data.length
    codesCommunes.forEach(c => globalCommunes.add(c))
    features.push(createFeature(meta, codesCommunes))
  })

  csvFile.end()
  await finished(csvFile)

  await writeJsonFile('datasets.lo.geojson', featureCollection(features.filter(f => !f.properties.odbl)))
  await writeJsonFile('datasets.odbl.geojson', featureCollection(features.filter(f => f.properties.odbl)))

  console.log(`${globalCommunes.size} communes couvertes !`)
  console.log(`Adresses acceptées : ${adressesCount}`)
  console.log(`Adresses avec erreurs : ${erroredAdressesCount}`)

  const populationCount = [...globalCommunes].reduce((acc, codeCommune) => {
    if (population[codeCommune]) {
      return acc + population[codeCommune]
    }
    return acc
  }, 0)

  console.log(`Population couverte : ${populationCount}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
