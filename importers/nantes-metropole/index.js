const codesPostaux = require('codes-postaux')
const {chain, deburr} = require('lodash')
const leven = require('leven')

function nomVoie(data) {
  const {numero, adresse} = data._default
  const nomVoie = adresse.substr(numero.length).trim()
  return nomVoie
}

function codeCommune(data) {
  const {code_postal, nomcom} = data._default
  return chain(codesPostaux.find(code_postal))
    .map(candidate => {
      const {codeCommune, nomCommune} = candidate
      const comparableNomCommune = deburr(nomCommune.replace(/\s/g, '-').toUpperCase())
      const distance = leven(comparableNomCommune, nomcom)
      return {codeCommune, nomCommune, distance}
    })
    .maxBy('distance')
    .value()
    .codeCommune
}

module.exports = {nomVoie, codeCommune}
