function voie_code(data) {
  if (data._default.rivoli_id && data._default.rivoli_id.length === 9) {
    return data._default.rivoli_id.substr(5)
  }
}

function voie_nom(data) {
  const {numero, suffixe, auto_adres} = data._default
  const numeroComplet = `${numero}${suffixe || ''}`
  return auto_adres.substr(numeroComplet.length).trim()
}

module.exports = {voie_nom, voie_code}
