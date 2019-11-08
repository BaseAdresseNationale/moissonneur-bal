function codeCommune(data) {
  if (data._default.c_ar) {
    return String(75100 + data._default.c_ar)
  }
}

module.exports = {codeCommune}
