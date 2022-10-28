const stringify = require('fast-json-stable-stringify')
const hasha = require('hasha')

function signRow(row) {
  const stringifiedRow = stringify(row)
  return hasha(stringifiedRow)
}

function signData(data) {
  const signedRows = data.map(d => signRow(d))
  const sortedSignatures = signedRows.sort().join('|')

  return hasha(sortedSignatures)
}

module.exports = {signRow, signData}
