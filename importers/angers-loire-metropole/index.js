function dateMAJ(data) {
  const {date_maj} = data._default
  if (date_maj) {
    return `${date_maj.substr(6, 4)}-${date_maj.substr(3, 2)}-${date_maj.substr(0, 2)}`
  }
}

module.exports = {dateMAJ}
