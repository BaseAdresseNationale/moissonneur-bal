#!/usr/bin/env node --max_old_space_size=8192
require('dotenv').config()
const {createWriteStream} = require('fs')
const {promisify} = require('util')
const {join} = require('path')
const Keyv = require('keyv')
const bluebird = require('bluebird')
const {uniq} = require('lodash')
const chalk = require('chalk')
const {featureCollection} = require('@turf/turf')
const writeJsonFile = require('write-json-file')
const csvWriter = require('csv-write-stream')
const pumpify = require('pumpify')
const {pick} = require('lodash')
const finished = promisify(require('end-of-stream'))
const {extractAsTree} = require('@etalab/bal')
const {readYamlFile} = require('./lib/util')
const customImportData = require('./lib/importers').importData
const balImportData = require('./lib/bal').importData
const {createFeature} = require('./lib/meta')
const {loadPopulation} = require('./lib/population')
const {getEligibleBALDatasets, getDataset, getOrganization, getBALUrl} = require('./lib/datagouv')

const db = new Keyv('sqlite://bal.sqlite')

const sourcesFilePath = join(__dirname, 'sources.yml')

function importData(config) {
  if (config.importer) {
    return customImportData(config.importer)
  }
  if (config.url) {
    return balImportData(config.url)
  }
  console.error('Configuration incomplète !')
  console.error(config)
  process.exit(1)
}

async function augmentCustomEntry(entry) {
  let dataset
  let organization

  if (entry.dataset) {
    dataset = await getDataset(entry.dataset)
  }
  if (entry.organization || (dataset && dataset.organization)) {
    organization = await getOrganization(entry.organization || dataset.organization.id)
  }

  if (!entry.url && !entry.importer && dataset) {
    return {...entry, dataset, organization, url: getBALUrl(dataset)}
  }

  return {...entry, dataset, organization}
}

function prepareEligibleEntry(dataset) {
  return {
    dataset,
    organization: dataset.organization,
    url: getBALUrl(dataset)
  }
}

async function computeList() {
  const sources = await readYamlFile(sourcesFilePath)

  const blacklistedIds = sources.blackList.map(e => e.dataset)
  const whitelistedIds = sources.whiteList.filter(e => e.dataset).map(e => e.dataset)

  const eligibleBALDatasets = (await getEligibleBALDatasets())
    .filter(d => !blacklistedIds.includes(d.id) && !whitelistedIds.includes(d.id))

  return [
    ...(await Promise.all(sources.whiteList.map(augmentCustomEntry))),
    ...(eligibleBALDatasets.map(prepareEligibleEntry))
  ]
}

function computeMeta(entry) {
  const odbl = Boolean(entry.odbl || (entry.dataset && entry.dataset.license === 'odc-odbl'))
  const name = entry.name || entry.dataset.title
  const model = entry.importer ? 'custom' : 'bal-aitf'
  const homepage = entry.homepage || entry.dataset.page
  const id = entry.slug || entry.dataset.id
  return {id, name, homepage, model, odbl}
}

const CSV_HEADERS = [
  'id',
  'codeCommune',
  'nomCommune',
  'codeVoie',
  'nomVoie',
  'numero',
  'suffixe',
  'lon',
  'lat'
]

function asCsv(row) {
  const result = pick(row, CSV_HEADERS)
  if (row.position) {
    result.lon = row.position[0]
    result.lat = row.position[1]
  }
  return result
}

async function main() {
  const population = await loadPopulation()
  const sources = await computeList()
  const globalCommunes = new Set()
  let adressesCount = 0
  let erroredAdressesCount = 0
  const features = []

  const csvFile = pumpify.obj(
    csvWriter({separator: ';', headers: CSV_HEADERS}),
    createWriteStream('adresses-locales.csv')
  )

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
    data.forEach(r => csvFile.write(asCsv(r)))
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
