const {keyBy} = require('lodash')
const communes = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => ['commune-actuelle', 'arrondissement-municipal'].includes(c.type))

const communesIndex = keyBy(communes, 'code')

function getCommune(codeCommune) {
  return communesIndex[codeCommune]
}

module.exports = {getCommune}
