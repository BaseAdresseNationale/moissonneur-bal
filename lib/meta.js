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

function expandMetaWithResults(meta, {tree, report, errored}) {
  meta.numerosCount = tree.numerosCount
  meta.communes = Object.keys(tree.communes)
  meta.contour = createContour(meta.communes)
  meta.dateMAJ = tree.dateMAJ
  if (report) {
    meta.isValid = report.isValid
  }

  meta.errored = errored
}

module.exports = {createContour, expandMetaWithResults}
