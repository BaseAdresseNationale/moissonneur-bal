function getPercentage(value, totalValue) {
  return (value * 100) / totalValue
}

function isErroredRow(row) {
  return row.errors.some(({level}) => level === 'E')
}

function getErrorPercentage(data) {
  const nbRows = data.rows.length
  const nbFilteredErroredRows = data.rows.filter(r => isErroredRow(r)).length

  return getPercentage(nbFilteredErroredRows, nbRows)
}

function getParsingErrorCodes(data) {
  return [...new Set(data.parseErrors.map(({code}) => code))]
}

module.exports = {getErrorPercentage, isErroredRow, getParsingErrorCodes}
