const {isWithinCommune} = require('../../contours')

function debug(str) {
  if (process.env.DEBUG_VALIDATE === '1') {
    console.log(str)
  }
}

function validate(adresse) {
  if (!adresse.commune_insee) {
    debug('Adresse sans commune_insee')
    return false
  }

  if (adresse.commune_insee.length !== 5) {
    debug(`commune_insee non valide : ${adresse.commune_insee}`)
    return false
  }

  if (!adresse.voie_nom || adresse.voie_nom.length <= 2) {
    debug(`voie_nom absent ou trop court : ${adresse.voie_nom || '(absent)'}`)
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

  if (!adresse.long || !adresse.lat) {
    debug('Coordonnées absentes')
    return false
  }

  if (!isWithinCommune([adresse.long, adresse.lat], adresse.commune_insee)) {
    debug('Position de l’adresse en dehors du périmètre de la commune.')
    return false
  }

  return true
}

module.exports = validate
