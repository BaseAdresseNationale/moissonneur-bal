const xlsx = require('node-xlsx')
const {zipObject} = require('lodash')

function loadData(buffer) {
  const [sheet] = xlsx.parse(buffer)
  const [header, ...rows] = sheet.data
  return rows.map(row => zipObject(header, row))
}

module.exports = {loadData}
