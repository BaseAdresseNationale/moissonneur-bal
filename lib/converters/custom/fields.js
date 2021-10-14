const {get, mapValues, compact, isUndefined, keyBy} = require('lodash')

function extractFields(data, fields) {
  const extractedFields = Object.keys(fields).reduce((result, fieldName) => {
    const pattern = fields[fieldName]
    result[fieldName] = compact(pattern.split(' + ').map(key => get(data, key))).join(' ')
    return result
  }, {})
  return extractedFields
}

const FIELDS = {
  lat: v => typeof v === 'number' ? v.toFixed(6) : v,
  long: v => typeof v === 'number' ? v.toFixed(6) : v,
  commune_insee: v => typeof v === 'number' ? String(v).padStart(5, '0') : v,
  voie_code: v => typeof v === 'number' ? String(v).padStart(4, '0') : v,
  code_postal: v => typeof v === 'number' ? String(v).padStart(5, '0') : v
}

function sanitizeFields(data) {
  return mapValues(data, (v, k) => {
    if (k in FIELDS) {
      return FIELDS[k](v)
    }

    return v
  })
}

function expandFields(data) {
  if (data.cle_interop && !data.commune_insee) {
    const [codeCommune] = data.cle_interop.split('_')
    data.commune_insee = codeCommune
  }

  if (data._numeroComplet && !data.numero) {
    const result = data._numeroComplet.match(/^(\d+)(\D.*)?$/)
    if (result) {
      const [, numero, suffixe] = result
      data.numero = numero
      data.suffixe = suffixe ? suffixe.trim() : null
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

function computeConsolidated(resources, functions, config) {
  const computedFields = config.computedFields || []
  const joins = config.join || []
  const joinedResourceData = applyJoins(resources, joins)

  return joinedResourceData.map(data => {
    computedFields.forEach(computedField => {
      const computedValue = functions[computedField](data)
      if (!isUndefined(computedValue)) {
        data[computedField] = computedValue
      }
    })

    const completeData = expandFields(sanitizeFields(data))

    return Object.keys(completeData)
      .filter(key => !key.startsWith('_'))
      .reduce((obj, key) => {
        obj[key] = completeData[key]
        return obj
      }, {})
  })
}

module.exports = {extractFields, expandFields, sanitizeFields, computeConsolidated}
