function voie_code(data) {
  const {id_voie} = data._default
  if (!id_voie || id_voie.length !== 8) {
    return undefined
  }

  return id_voie.slice(4)
}

module.exports = {voie_code}
