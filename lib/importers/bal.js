const {pick, take} = require('lodash')
const {validate} = require('@etalab/bal')

const REPORT_KEYS_TO_PERSIST = [
  'knownFields',
  'unknownFields',
  'aliasedFields',
  'fileValidation',
  'rowsWithIssues',
  'parseMeta',
  'issuesSummary',
  'isValid'
]

function extractPersistableReport(fullReport) {
  const persistableReport = pick(fullReport, REPORT_KEYS_TO_PERSIST)
  persistableReport.rowsWithIssues = take(
    fullReport.rowsWithIssues,
    1000
  )
  persistableReport.rowsWithIssuesCount = fullReport.rowsWithIssues.length
  return persistableReport
}

async function importData(source) {
  const {data} = source.resources.default
  const report = await validate(data)
  const {normalizedRows, validatedRows} = report
  return {
    data: normalizedRows,
    errored: validatedRows.length - normalizedRows.length,
    report: extractPersistableReport(report)
  }
}

module.exports = {importData}
