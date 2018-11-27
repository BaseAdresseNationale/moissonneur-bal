function nomVoie(data) {
  const {l_nvoie, l_adr} = data._default
  const nomVoie = l_adr.substr(l_nvoie.length).trim()
  return nomVoie
}

function codeCommune(data) {
  if (data._default.c_ar) {
    return String(75100 + data._default.c_ar)
  }
}

module.exports = {nomVoie, codeCommune}
