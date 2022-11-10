function getPercentage(value, totalValue) {
  return (value * 100) / totalValue
}

function getErrorPercentage(result) {
  const nbRows = result.rows.length
  const nbFilteredErroredRows = result.rows.filter(r => !r.isValid).length

  return getPercentage(nbFilteredErroredRows, nbRows)
}

function getParsingErrorCodes(result) {
  return [...new Set(result.parseErrors.map(({code}) => code))]
}

module.exports = {getErrorPercentage, getParsingErrorCodes}
