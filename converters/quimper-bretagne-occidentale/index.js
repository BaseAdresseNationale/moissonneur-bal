const fields = {
  commune_insee(data) {
    return data._default.IDCOMM.substr(0, 2) + data._default.IDCOMM.substr(3, 3)
  },

  voie_code(data) {
    if (data._default.VOI_CODE) {
      return data._default.VOI_CODE.substr(0, 4)
    }
  },

  voie_nom(data) {
    const {ADR_TEXT, ADR_OBS} = data._default
    return ADR_OBS.substr(ADR_TEXT.length).trim()
  },

  date_der_maj(data) {
    const {ADR_DATEMA} = data._default
    if (ADR_DATEMA.startsWith('20')) {
      return ADR_DATEMA.substr(0, 10)
    }
  }
}

module.exports = fields
