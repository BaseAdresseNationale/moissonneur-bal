function validate(adresse) {
  if (!adresse.codeCommune) {
    // console.log('Adresse sans codeCommune')
    return false
  }
  if (adresse.codeCommune.length !== 5) {
    // console.log(`codeCommune non valide : ${adresse.codeCommune}`)
    return false
  }
  if (!adresse.nomVoie || adresse.nomVoie.length <= 2) {
    // console.log(`nomVoie absent ou trop court : ${adresse.nomVoie || '(absent)'}`)
    return false
  }
  if (!adresse.numero || !String(adresse.numero).match(/^\d+$/)) {
    // console.log(`numero absent ou non valide : ${adresse.numero || '(absent)'}`)
    return false
  }
  return true
}

module.exports = validate
