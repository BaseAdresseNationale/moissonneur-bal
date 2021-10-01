const {chain} = require('lodash')
const {union} = require('@turf/turf')
const {getContourCommune} = require('./contours')
const {getCommune} = require('./cog')

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

function expandMetaWithResults(meta, {rows, report, errored}) {
  meta.rowsCount = rows.length
  meta.communes = chain(rows)
    .filter(r => r.isValid)
    .groupBy(r => r.parsedValues.commune_insee || r.additionalValues.cle_interop.codeCommune)
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
        dateMAJ: chain(rowsCommune).map(r => r.parsedValues.date_der_maj).compact().max().value()
      }
    })
    .compact()
    .value()

  meta.contour = createContour(meta.communes.map(c => c.code))
  meta.dateMAJ = chain(rows).map(r => r.parsedValues.date_der_maj).compact().max().value()

  if (report) {
    meta.isValid = report.profilesValidation['1.2-etalab'].isValid
  }

  meta.errored = errored
}

module.exports = {createContour, expandMetaWithResults}
