function nomVoie(data) {
  const prefixe = `${data.num || ''} ${data.rep || ''}`.trim()
  const suffixe = `${data.cp} ${data.commune}`
  return data.ident.substring(prefixe.length + 1, data.ident.length - suffixe.length - 1)
}

module.exports = {nomVoie}
