function getPercentage(value, totalValue) {
  return (value * 100) / totalValue
}

function isErroredRow(row) {
  return row.errors.some(({level}) => level === 'E')
}

function getNbErrors(rows) {
  return rows.filter(r => isErroredRow(r)).length
}

function getErrorPercentage(data) {
  const nbRows = data.rows.length
  const nbFilteredErroredRows = getNbErrors(data.rows)

  return getPercentage(nbFilteredErroredRows, nbRows)
}

module.exports = {getNbErrors, getErrorPercentage}
