const {join} = require('path')
const bluebird = require('bluebird')
const {mapValues} = require('lodash')
const decompress = require('decompress')

const {fetchResource} = require('../fetch')
const {readYamlFile} = require('../util')

const shp = require('./readers/shp')
const csv = require('./readers/csv')
const geojson = require('./readers/geojson')
const sheet = require('./readers/sheet')

const validate = require('./validate')
const {extractFields, computeConsolidated} = require('./fields')

const importersPath = join(__dirname, '..', '..', 'importers')

async function loadData(buffer, options = {}) {
  if (options.archivePath) {
    const files = await decompress(buffer)
    const file = files.find(f => f.path === options.archivePath)
    if (!file) {
      throw new Error('Fichier non trouvé dans l’archive')
    }
    return loadData(file.data, {...options, archivePath: null})
  }
  if (options.format === 'shp') {
    return shp.loadData(buffer, options)
  }
  if (options.format === 'csv') {
    return csv.loadData(buffer, options)
  }
  if (options.format === 'geojson') {
    return geojson.loadData(buffer, options)
  }
  if (options.format === 'sheet') {
    return sheet.loadData(buffer, options)
  }
  throw new Error(`Format ${options.format} inconnu`)
}

const AITF_FIELDS = {
  cleInterop: 'cle_interop',
  nomVoie: 'voie_nom',
  numero: 'numero',
  suffixe: 'suffixe',
  typePosition: 'position',
  lon: 'long',
  lat: 'lat',
  source: 'source',
  dateMAJ: 'date_der_maj'
}

function getFunctions(importer) {
  try {
    return require(`../../importers/${importer}`)
  } catch (error) {
    return {}
  }
}

function getConfig(importer) {
  return readYamlFile(join(importersPath, importer, 'config.yml'))
}

async function importData(importer) {
  const config = await getConfig(importer)
  const functions = getFunctions(importer)
  const computedFields = config.computedFields || []
  const join = config.join || []

  const resources = await bluebird.props(mapValues(config.resources, async (resourceConfig, resourceName) => {
    const resource = await fetchResource(resourceConfig.url)
    const data = await loadData(resource, resourceConfig)
    const fields = resourceConfig.model === 'aitf' ? AITF_FIELDS : resourceConfig.fields
    return data.map(item => ({...extractFields(item, fields), ['_' + resourceName]: item}))
  }))

  let errored = 0
  const data = computeConsolidated(resources, computedFields, functions, join)
    .filter(a => {
      const isValid = validate(a)
      if (!isValid) {
        errored++
      }
      return isValid
    })

  return {data, errored}
}

module.exports = {importData}
