const {take} = require('lodash')
const {validate} = require('@etalab/bal')

async function importData(source) {
  const {data} = source.resources.default
  const report = await validate(data)
  const {rows} = report
  return {
    originalFile: data,
    rows: rows.filter(r => r.isValid).map(r => r.rawValues),
    errored: rows.filter(r => !r.isValid).length,
    report: {
      ...report,
      rows: take(report.rows.filter(r => r.errors.length > 0), 1000)
    }
  }
}

module.exports = {importData}
