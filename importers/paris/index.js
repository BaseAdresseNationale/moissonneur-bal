function commune_insee(data) {
  if (data._default.c_ar) {
    return String(75100 + data._default.c_ar)
  }
}

module.exports = {commune_insee}
