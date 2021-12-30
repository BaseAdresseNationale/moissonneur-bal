const fields = {
  commune_insee() {
    return '38185'
  },

  voie_nom(data) {
    return [data._default.VOIE_TYPE, data._default.VOIE_ARTICLE, data._default.VOIE_LIBEL]
      .filter(p => Boolean(p))
      .join(' ')
      .replace(/'\s/g, '\'')
      .replace(/’\s/g, '’')
  }
}

module.exports = fields
