const {keyBy, groupBy} = require('lodash')
const epcis = require('@etalab/decoupage-administratif/data/epci.json')
const communes = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => ['commune-actuelle', 'arrondissement-municipal'].includes(c.type))

const arrondissements = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => ['arrondissement-municipal'].includes(c.type))

const communeByDepartement = groupBy(communes, 'departement')

const epciByCode = keyBy(epcis, 'code')

function getCommuneByDepartement(codeDepartement) {
  return communeByDepartement[codeDepartement]
}

function getEPCI(siren) {
  return epciByCode[siren]
}

function isArrondissement(codeArrondissement) {
  return arrondissements.some(({code}) => code === codeArrondissement)
}

function getCommuneByArrondissement(codeArrondissement) {
  return arrondissements.find(({code}) => code === codeArrondissement)
}

module.exports = {
  getEPCI,
  getCommuneByDepartement,
  isArrondissement,
  getCommuneByArrondissement
}
