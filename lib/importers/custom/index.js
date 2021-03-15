const bluebird = require('bluebird')
const {take, mapValues} = require('lodash')
const Papa = require('papaparse')
const decompress = require('decompress')
const {validate} = require('@etalab/bal')

const shp = require('./readers/shp')
const csv = require('./readers/csv')
const geojson = require('./readers/geojson')
const sheet = require('./readers/sheet')

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

  const consolidatedRows = computeConsolidated(resources, functions, config)

  const report = await validate(Buffer.from(Papa.unparse(consolidatedRows)))
  const {rows} = report

  return {
    data: rows.filter(r => r.isValid).map(r => r.rawValues),
    errored: rows.filter(r => !r.isValid).length,
    report: {
      ...report,
      rows: take(report.rows.filter(r => r.errors.length > 0), 1000)
    }
  }
}

module.exports = {importData}
