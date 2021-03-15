const {chain, keyBy} = require('lodash')
const {union} = require('@turf/turf')
const {getContourCommune} = require('./contours')
const communes = require('@etalab/decoupage-administratif/data/communes.json')
const communesActuelles = communes.filter(c => ['commune-actuelle', 'arrondissement-municipal'].includes(c.type))
const communesAnciennes = communes.filter(c => !['commune-actuelle', 'arrondissement-municipal'].includes(c.type))

const communesActuellesIndex = keyBy(communesActuelles, 'code')
const communesAnciennesIndex = keyBy(communesAnciennes, 'code')

function getCommune(codeCommune) {
  return communesActuellesIndex[codeCommune] || communesAnciennesIndex[codeCommune]
}

function createContour(codesCommunes) {
  const contoursCommunes = codesCommunes
    .filter(Boolean)
    .map(codeCommune => getContourCommune(codeCommune))
    .filter(Boolean)

  if (contoursCommunes.length === 0) {
    throw new Error('Impossible de construire le contour : communes inconnues')
  }

  if (contoursCommunes.length === 1) {
    return contoursCommunes[0].geometry
  }

  return union(...contoursCommunes).geometry
}

function expandMetaWithResults(meta, {data, report, errored}) {
  meta.rowsCount = data.length
  meta.communes = chain(data)
    .groupBy('commune_insee')
    .map((rowsCommune, codeCommune) => {
      const commune = getCommune(codeCommune)

      if (!commune) {
        return null
      }

      const {code, nom, type} = commune

      return {
        code,
        nom,
        type,
        rowsCount: rowsCommune.length,
        dateMAJ: chain(rowsCommune).map('date_der_maj').compact().max().value()
      }
    })
    .compact()
    .value()

  meta.contour = createContour(meta.communes.map(c => c.code))
  meta.dateMAJ = chain(data).map('date_der_maj').compact().max().value()

  if (report) {
    meta.isValid = report.profilesValidation['1.2-etalab'].isValid
  }

  meta.errored = errored
}

module.exports = {createContour, expandMetaWithResults}
