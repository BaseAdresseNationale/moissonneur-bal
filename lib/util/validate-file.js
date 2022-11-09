function getPercentage(value, totalValue) {
  return (value * 100) / totalValue
}

function getErrorPercentage(data) {
  const nbRows = data.rows.length
  const nbFilteredErroredRows = data.rows.filter(r => !r.isValid).length

  return getPercentage(nbFilteredErroredRows, nbRows)
}

module.exports = {getErrorPercentage}
