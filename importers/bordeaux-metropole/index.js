function codeVoie(data) {
  const {FANTOIR} = data._default
  if (!FANTOIR) {
    return undefined
  }

  return FANTOIR.substr(0, 4)
}

function codeCommune(data) {
  const {CINSEE} = data._default
  return CINSEE.length === 3 ? '33' + CINSEE : CINSEE
}

module.exports = {codeVoie, codeCommune}
