const bluebird = require('bluebird')
const {mapValues, intersection, difference} = require('lodash')
const Papa = require('papaparse')
const decompress = require('decompress')

const shp = require('./readers/shp')
const csv = require('./readers/csv')
const geojson = require('./readers/geojson')
const sheet = require('./readers/sheet')

const {extractFields, computeConsolidated} = require('./fields')
const convertConfig = require('./config')

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

const AITF_FIELDS = [
  'uid_adresse',
  'cle_interop',
  'commune_insee',
  'commune_nom',
  'commune_deleguee_insee',
  'commune_deleguee_nom',
  'voie_nom',
  'lieudit_complement_nom',
  'numero',
  'suffixe',
  'position',
  'x',
  'y',
  'long',
  'lat',
  'cad_parcelles',
  'source',
  'date_der_maj'
]

const AITF_FIELDS_DEFAULT_MAP = AITF_FIELDS.reduce((acc, item) => {
  acc[item] = item
  return acc
}, {})

async function convert(source) {
  const {config, functions} = convertConfig[source.converter]
  const resources = await bluebird.props(mapValues(source.resources, async (resource, resourceName) => {
    const data = await loadData(resource.data, resource)
    const fields = resource.model === 'aitf' ? AITF_FIELDS_DEFAULT_MAP : resource.fields
    const result = data.map(item => ({...extractFields(item, fields), ['_' + resourceName]: item}))
    return result
  }))

  const consolidatedRows = computeConsolidated(resources, functions, config)
  const columns = Object.keys(consolidatedRows[0])
  const selectedColumns = [
    ...intersection(AITF_FIELDS, columns),
    ...difference(columns, AITF_FIELDS)
  ]
  const convertedFile = Buffer.from(Papa.unparse(consolidatedRows, {
    delimiter: ';',
    columns: selectedColumns
  }))

  return {originalFile: convertedFile}
}

module.exports = convert
