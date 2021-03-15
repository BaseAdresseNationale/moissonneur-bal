const {keyBy} = require('lodash')
const communes = require('../communes-100m.json')

const communesIndex = keyBy(communes.features, 'properties.code')

function getCodeCommune(codeCommune) {
  if (codeCommune.startsWith('75')) {
    return '75056'
  }

  if (codeCommune.startsWith('6938')) {
    return '69123'
  }

  if (codeCommune.startsWith('132')) {
    return '13055'
  }

  return codeCommune
}

function getContourCommune(codeCommune) {
  return communesIndex[getCodeCommune(codeCommune)]
}

module.exports = {getContourCommune}
