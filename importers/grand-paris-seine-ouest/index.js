function codeVoie(data) {
  if (data._default.CODE_RIVOL) {
    return data._default.CODE_RIVOL.split('_')[1]
  }
}

module.exports = {codeVoie}
