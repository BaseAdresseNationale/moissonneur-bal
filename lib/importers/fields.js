const {get, mapValues, compact, isUndefined, keyBy} = require('lodash')
const {getCommune} = require('../cog')

function extractFields(data, fields) {
  const extractedFields = Object.keys(fields).reduce((result, fieldName) => {
    const pattern = fields[fieldName]
    result[fieldName] = compact(pattern.split(' + ').map(key => get(data, key))).join(' ')
    return result
  }, {})
  return extractedFields
}

function parseCleInterop(cleInterop) {
  const [codeCommune, codeVoie, numero, ...suffixe] = cleInterop.split('_')
  return {
    codeCommune,
    codeVoie,
    numero: Number.parseInt(numero, 10).toString(),
    suffixe: suffixe.length > 0 ? suffixe.join(' ') : null
  }
}

function customParseFloat(str) {
  const number = parseFloat(str.replace(',', '.'))
  return Number.isNaN(number) ? undefined : number
}

const FIELDS = {
  lat: v => typeof v === 'number' ? v : customParseFloat(v),
  lon: v => typeof v === 'number' ? v : customParseFloat(v),
  numeroComplet: v => {
    if (typeof v === 'string') {
      return v
    }
    if (typeof v === 'number' && Number.isInteger(v)) {
      return String(v).toUpperCase()
    }
    return null
  },
  suffixe: v => v ? v.toUpperCase() : null,
  numero: v => String(v),
  codeCommune: v => String(v).toUpperCase().padStart(4, '0'),
  codeVoie: v => String(v).toUpperCase().padStart(4, '0'),
  codePostal: v => String(v).toUpperCase().padStart(5, '0')
}

function sanitizeFields(data) {
  return mapValues(data, (v, k) => {
    if (k.startsWith('_')) {
      return undefined
    }
    if (k in FIELDS) {
      return FIELDS[k](v)
    }
    return v
  })
}

function expandFields(data) {
  if (data.cleInterop) {
    const {codeCommune, codeVoie, numero, suffixe} = parseCleInterop(data.cleInterop)
    if (!('codeCommune' in data)) {
      data.codeCommune = codeCommune.toUpperCase()
    }
    if (!('codeVoie' in data)) {
      data.codeVoie = codeVoie.toUpperCase()
    }
    if (!('numero' in data)) {
      data.numero = numero
    }
    if (!('suffixe' in data)) {
      data.suffixe = suffixe
    }
  }
  if (data.numeroComplet && !data.numero) {
    const result = data.numeroComplet.match(/^(\d+)(\D.*)?$/)
    if (result) {
      const [, numero, suffixe] = result
      data.numero = numero
      data.suffixe = suffixe ? suffixe.trim() : null
    }
  }
  if (!data.numeroComplet && data.numero) {
    data.numeroComplet = `${data.numero}${data.suffixe || ''}`
  }
  if (data.lon && data.lat) {
    data.position = {type: 'Point', coordinates: [data.lon, data.lat]}
  }
  if (data.codeCommune) {
    const commune = getCommune(data.codeCommune)
    if (commune) {
      data.nomCommune = commune.nom
    }
  }
  return data
}

function applyJoins(resources, joins) {
  if (!joins || joins.length === 0) {
    return resources.default
  }
  const joinIndexes = {}
  joins.forEach(({resource, key}) => {
    joinIndexes[key] = keyBy(resources[resource], key)
  })
  return resources.default.map(defaultRow => {
    return joins.reduce((row, {key}) => {
      const foreignKey = row[key]
      if (!foreignKey) {
        return row
      }
      const foreignRow = joinIndexes[key][foreignKey]
      if (!foreignRow) {
        return row
      }
      return {...foreignRow, ...row}
    }, defaultRow)
  })
}

function computeConsolidated(resources, computedFields, functions, joins) {
  const joinedResourceData = applyJoins(resources, joins)

  return joinedResourceData.map(data => {
    computedFields.forEach(computedField => {
      const computedValue = functions[computedField](data)
      if (!isUndefined(computedValue)) {
        data[computedField] = computedValue
      }
    })
    return expandFields(sanitizeFields(data))
  })
}

module.exports = {extractFields, expandFields, sanitizeFields, computeConsolidated}
