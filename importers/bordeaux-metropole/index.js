function codeVoie(data) {
  const {FANTOIR} = data._default
  if (!FANTOIR) {
    return undefined
  }

  return FANTOIR.substr(0, 4)
}

module.exports = {codeVoie}
