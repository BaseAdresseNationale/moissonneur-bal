const {keyBy, groupBy} = require('lodash')
const epcis = require('@etalab/decoupage-administratif/data/epci.json')
const communes = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => ['commune-actuelle', 'arrondissement-municipal'].includes(c.type))

const communeByDepartement = groupBy(communes, 'departement')

const epciByCode = keyBy(epcis, 'code')

function getCommuneByDepartement(codeDepartement) {
  return communeByDepartement[codeDepartement]
}

function getEPCI(siren) {
  return epciByCode[siren]
}

module.exports = {
  getEPCI,
  getCommuneByDepartement
}
