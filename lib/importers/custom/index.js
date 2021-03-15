const bluebird = require('bluebird')
const {mapValues} = require('lodash')
const decompress = require('decompress')

const shp = require('./readers/shp')
const csv = require('./readers/csv')
const geojson = require('./readers/geojson')
const sheet = require('./readers/sheet')

const validate = require('./validate')
const {extractFields, computeConsolidated} = require('./fields')
const importersConfig = require('./config')

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
  cle_interop: 'cle_interop',
  voie_nom: 'voie_nom',
  numero: 'numero',
  suffixe: 'suffixe',
  position: 'position',
  long: 'long',
  lat: 'lat',
  source: 'source',
  date_der_maj: 'date_der_maj'
}

async function importData(source) {
  const {config, functions} = importersConfig[source.importer]
  const resources = await bluebird.props(mapValues(config.resources, async (resource, resourceName) => {
    const data = await loadData(resource.data, resource)
    const fields = resource.model === 'aitf' ? AITF_FIELDS : resource.fields
    const result = data.map(item => ({...extractFields(item, fields), ['_' + resourceName]: item}))
    return result
  }))

  let errored = 0

  const data = computeConsolidated(resources, functions, config)
    .filter(a => {
      const isValid = validate(a)
      if (!isValid) {
        errored++
      }

      return isValid
    })

  return {
    data,
    errored
  }
}

module.exports = {importData}
