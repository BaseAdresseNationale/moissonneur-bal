const {isWithinCommune} = require('../contours')

function debug(str) {
  if (process.env.DEBUG_VALIDATE === '1') {
    console.log(str)
  }
}

function validate(adresse) {
  if (!adresse.codeCommune) {
    debug('Adresse sans codeCommune')
    return false
  }

  if (adresse.codeCommune.length !== 5) {
    debug(`codeCommune non valide : ${adresse.codeCommune}`)
    return false
  }

  if (!adresse.nomVoie || adresse.nomVoie.length <= 2) {
    debug(`nomVoie absent ou trop court : ${adresse.nomVoie || '(absent)'}`)
    return false
  }

  if (!adresse.numero || !String(adresse.numero).match(/^[1-9]\d*$/)) {
    debug(`numero absent ou non valide : ${adresse.numero || '(absent)'}`)
    return false
  }

  if (adresse.suffixe && !adresse.suffixe.match(/^[a-z]/i)) {
    debug(`suffixe ne commençant pas par un caractère alphabétique : ${adresse.suffixe}`)
    return false
  }

  if (!adresse.lon || !adresse.lat) {
    debug('Coordonnées absentes')
    return false
  }

  if (!isWithinCommune([adresse.lon, adresse.lat], adresse.codeCommune)) {
    debug('Position de l’adresse en dehors du périmètre de la commune.')
    return false
  }

  return true
}

module.exports = validate
