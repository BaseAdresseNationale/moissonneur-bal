function getPercentage(value, totalValue) {
  const percentage = (value * 100) / totalValue
  return Math.floor(percentage * 10) / 10
}

function isErroredRow(row) {
  return row.errors.some(({level}) => level === 'E')
}

function getErrorPercentage(data) {
  const nbRows = data.rows.length
  const nbFilteredErroredRows = data.rows.filter(r => isErroredRow(r)).length

  return getPercentage(nbFilteredErroredRows, nbRows)
}

module.exports = {getErrorPercentage}
