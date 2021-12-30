const fields = {
  voie_code(data) {
    const {fantoir} = data._default
    if (!fantoir) {
      return undefined
    }

    return fantoir.substr(0, 4)
  },

  commune_insee(data) {
    const {cinsee} = data._default
    return cinsee.length === 3 ? '33' + cinsee : cinsee
  }
}

module.exports = fields
