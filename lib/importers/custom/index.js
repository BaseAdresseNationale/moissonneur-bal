const bluebird = require('bluebird')
const {mapValues, uniq, fromPairs} = require('lodash')
const decompress = require('decompress')

const {createFantoirCommune} = require('@etalab/fantoir')

const shp = require('./readers/shp')
const csv = require('./readers/csv')
const geojson = require('./readers/geojson')
const sheet = require('./readers/sheet')

const validate = require('./validate')
const {extractFields, computeConsolidated} = require('./fields')

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

const codesVoiesSequences = {}

function getNextCodeVoie(codeCommune) {
  if (!(codeCommune in codesVoiesSequences)) {
    codesVoiesSequences[codeCommune] = 1
  }

  const num = codesVoiesSequences[codeCommune]++
  if (num < 1000) {
    return 'X' + String(num).padStart(3, '0')
  }

  if (num < 2000) {
    return 'Y' + String(num - 1000).padStart(3, '0')
  }

  if (num < 3000) {
    return 'Z' + String(num - 2000).padStart(3, '0')
  }

  throw new Error('Limite FANTOIR pseudo-voies atteinte')
}

const codesVoies = {}

function getCodeVoie(codeCommune, nomVoie, fantoirCommune) {
  if (!(codeCommune in codesVoies)) {
    codesVoies[codeCommune] = new Map()
  }

  if (!codesVoies[codeCommune].has(nomVoie)) {
    const voieFound = fantoirCommune.findVoie(nomVoie)
    const codeVoie = voieFound ? voieFound.codeFantoir : getNextCodeVoie(codeCommune)
    codesVoies[codeCommune].set(nomVoie, codeVoie)
  }

  return codesVoies[codeCommune].get(nomVoie)
}

function normalize(row, fantoirCommunes) {
  const codeVoie = row.codeVoie ||
    getCodeVoie(row.codeCommune, row.nomVoie, fantoirCommunes[row.codeCommune])
  return {
    ...row,
    id: `${row.codeCommune}-${codeVoie}-${row.numeroComplet}`,
    idVoie: `${row.codeCommune}-${codeVoie}`,
    codeVoie,
    typePosition: 'inconnue',
    position: row.position.coordinates,
    dateMAJ: undefined,
    source: undefined
  }
}

function prepareFantoir(codesCommunes) {
  return bluebird.props(fromPairs(
    codesCommunes.map(codeCommune => [codeCommune, createFantoirCommune(codeCommune)])
  ))
}

async function importData(source) {
  const {config, functions} = source

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

  const codesCommunes = uniq(data.map(d => d.codeCommune))
  const fantoirCommunes = await prepareFantoir(codesCommunes)
  const normalizedData = data.map(row => normalize(row, fantoirCommunes))

  return {
    data: normalizedData,
    errored
  }
}

module.exports = {importData}
