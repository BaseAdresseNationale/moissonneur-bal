const {keyBy} = require('lodash')
const communes = require('@etalab/decoupage-administratif/data/communes.json')

const communesActuelles = communes.filter(c => ['commune-actuelle', 'arrondissement-municipal'].includes(c.type))
const communesAnciennes = communes.filter(c => !['commune-actuelle', 'arrondissement-municipal'].includes(c.type))

const communesActuellesIndex = keyBy(communesActuelles, 'code')
const communesAnciennesIndex = keyBy(communesAnciennes, 'code')

function getCommune(codeCommune) {
  return communesActuellesIndex[codeCommune] || communesAnciennesIndex[codeCommune]
}

module.exports = {getCommune}
