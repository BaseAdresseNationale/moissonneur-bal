const {keyBy} = require('lodash')

const communesActuelles = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => ['commune-actuelle', 'arrondissement-municipal'].includes(c.type))

const communesAnciennes = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => ['commune-deleguee', 'commune-associee'].includes(c.type))

const communesActuellesIndex = keyBy(communesActuelles, 'code')
const communesAnciennesIndex = keyBy(communesAnciennes, 'code')

function getCommune(codeCommune) {
  return communesActuellesIndex[codeCommune] || communesAnciennesIndex[codeCommune]
}

function getCodeDepartement(codeCommune) {
  return codeCommune.startsWith('97') ? codeCommune.substr(0, 3) : codeCommune.substr(0, 2)
}

module.exports = {getCommune, getCodeDepartement}
