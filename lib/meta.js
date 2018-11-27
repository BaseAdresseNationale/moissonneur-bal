const {keyBy} = require('lodash')
const {feature, union} = require('@turf/turf')
const communes = require('../communes-100m.json')

const communesIndex = keyBy(communes.features, 'properties.code')

function createContour(codesCommunes) {
  const contoursCommunes = codesCommunes
    .filter(Boolean)
    .map(codeCommune => {
      if (codeCommune.startsWith('75')) {
        return communesIndex['75056']
      }
      if (codeCommune.startsWith('6938')) {
        return communesIndex['69123']
      }
      if (codeCommune.startsWith('132')) {
        return communesIndex['13055']
      }
      return communesIndex[codeCommune]
    })
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
