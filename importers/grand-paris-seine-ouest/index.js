function nomVoie(data) {
  const {num, rep, cp, commune, ident} = data._default
  const prefixe = `${num || ''} ${rep || ''}`.trim()
  const suffixe = `${cp} ${commune}`
  return ident.substring(prefixe.length + 1, ident.length - suffixe.length - 1)
}

module.exports = {nomVoie}
