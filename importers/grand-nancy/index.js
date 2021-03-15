function commune_insee(data) {
  const {COM} = data._default
  return `54${COM}`
}

module.exports = {commune_insee}
