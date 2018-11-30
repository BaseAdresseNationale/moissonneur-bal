const {feature, union} = require('@turf/turf')
const {getContourCommune} = require('./contours')

function createContour(codesCommunes) {
  const contoursCommunes = codesCommunes
    .filter(Boolean)
    .map(getContourCommune)
    .filter(Boolean)

  if (contoursCommunes.length === 0) {
    throw new Error('Impossible de construire le contour : communes inconnues')
  }

  if (contoursCommunes.length === 1) {
    return contoursCommunes[0].geometry
  }

  return union(...contoursCommunes).geometry
}

function createFeature(meta, codesCommunes) {
  return feature(createContour(codesCommunes), meta)
}

module.exports = {createFeature, createContour}
