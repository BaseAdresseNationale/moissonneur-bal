const {isWithinCommune} = require('../contours')
const DEBUG_VALIDATE = process.env.DEBUG_VALIDATE === '1'

function validate(adresse) {
  if (!adresse.codeCommune) {
    DEBUG_VALIDATE && console.log('Adresse sans codeCommune')
    return false
  }

  if (adresse.codeCommune.length !== 5) {
    DEBUG_VALIDATE && console.log(`codeCommune non valide : ${adresse.codeCommune}`)
    return false
  }

  if (!adresse.nomVoie || adresse.nomVoie.length <= 2) {
    DEBUG_VALIDATE && console.log(`nomVoie absent ou trop court : ${adresse.nomVoie || '(absent)'}`)
    return false
  }

  if (!adresse.numero || !String(adresse.numero).match(/^[1-9]\d*$/)) {
    DEBUG_VALIDATE && console.log(`numero absent ou non valide : ${adresse.numero || '(absent)'}`)
    return false
  }

  if (adresse.suffixe && !adresse.suffixe.match(/^[a-z]/i)) {
    DEBUG_VALIDATE && console.log(`suffixe ne commençant pas par un caractère alphabétique : ${adresse.suffixe}`)
    return false
  }

  if (!adresse.lon || !adresse.lat) {
    DEBUG_VALIDATE && console.log('Coordonnées absentes')
    return false
  }

  if (!isWithinCommune([adresse.lon, adresse.lat], adresse.codeCommune)) {
    DEBUG_VALIDATE && console.log('Position de l’adresse en dehors du périmètre de la commune.')
    return false
  }

  return true
}

module.exports = validate
