const {chain} = require('lodash')
const {union} = require('@turf/turf')
const {getContourCommune} = require('./contours')

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
  meta.numerosCount = data.length
  meta.communes = chain(data).map('codeCommune').uniq().compact().value()
  meta.contour = createContour(meta.communes)
  meta.dateMAJ = chain(data).map('dateMAJ').compact().max().value()

  if (report) {
    meta.isValid = report.isValid
  }

  meta.errored = errored
}

module.exports = {createContour, expandMetaWithResults}
