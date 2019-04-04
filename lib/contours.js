const {keyBy} = require('lodash')
const {buffer, booleanPointInPolygon} = require('@turf/turf')
const communes = require('../communes-100m.json')
const {getCodeCommune} = require('./cog')

const bufferCache = {}

const communesIndex = keyBy(communes.features, 'properties.code')

function getContourCommune(codeCommune) {
  return communesIndex[getCodeCommune(codeCommune)]
}

function getContourCommuneBuffer(codeCommune) {
  if (!(codeCommune in bufferCache)) {
    const contourCommune = getContourCommune(codeCommune)
    if (!contourCommune) {
      return
    }

    bufferCache[codeCommune] = buffer(contourCommune, 0.5)
  }

  return bufferCache[codeCommune]
}

function isWithinCommune([lon, lat], codeCommune) {
  const buffer = getContourCommuneBuffer(codeCommune)
  if (!buffer) {
    // Console.log(`Contour introuvable pour le code commune : ${codeCommune}`)
    return true
  }

  return booleanPointInPolygon([lon, lat], buffer)
}

module.exports = {getCodeCommune, getContourCommune, isWithinCommune}
