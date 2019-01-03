const {keyBy} = require('lodash')
const communes = require('@etalab/cog/data/communes.json')

const communesIndex = keyBy(communes, 'code')

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

function getCommune(codeCommune) {
  return communesIndex[getCodeCommune(codeCommune)]
}

function getCodeDepartement(codeCommune) {
  const code = getCodeCommune(codeCommune)
  return code.startsWith('97') ? code.substr(0, 3) : code.substr(0, 2)
}

module.exports = {getCommune, getCodeCommune, getCodeDepartement}
