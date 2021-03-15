const {keyBy, deburr} = require('lodash')
const communes = require('@etalab/decoupage-administratif/data/communes.json')
const epci = require('@etalab/decoupage-administratif/data/epci.json')
const communesIndex = keyBy(communes, 'code')
const dlva = epci.find(e => e.code === '200034700')
const communesDlva = dlva.membres.map(m => communesIndex[m.code])

function normalize(string) {
  return deburr(string).toLowerCase().replace(/\W/g, '')
}

const customMapping = {
  corbieres: '04063'
}

function commune_insee(data) {
  const {ville} = data._default
  const normalizedVille = normalize(ville)

  if (!normalizedVille) {
    return
  }

  if (normalizedVille in customMapping) {
    return customMapping[normalizedVille]
  }

  const commune = communesDlva.find(c => normalize(c.nom) === normalizedVille)

  if (commune) {
    return commune.code
  }

  console.log(`Correspondance non trouvée pour la commune ${ville}`)
}

function _numeroComplet(data) {
  const {numero, complt} = data._default

  if (numero && complt.match(/^\d/)) {
    console.log(`Numéro complet impossible à constituer : ${numero} ${complt}`)
    return
  }

  return (numero || '') + (complt || '')
}

module.exports = {commune_insee, _numeroComplet}
