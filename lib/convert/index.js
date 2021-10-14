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

async function convert(converter, resources) {
  const {config, functions} = convertConfig[converter]
  const parsedResources = await bluebird.props(mapValues(resources, async (resource, resourceName) => {
    const data = await loadData(resource.data, resource)
    const result = data.map(item => ({...extractFields(item, resource.fields), ['_' + resourceName]: item}))
    return result
  }))

  const consolidatedRows = computeConsolidated(parsedResources, functions, config)
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

function getResourcesDefinitions(converter) {
  return convertConfig[converter].config.resources
}

module.exports = {convert, getResourcesDefinitions}
