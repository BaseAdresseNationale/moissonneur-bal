const {pick, take} = require('lodash')
const {validate} = require('@etalab/bal')
const {fetchResource} = require('../fetch')

const REPORT_KEYS_TO_PERSIST = [
  'knownFields',
  'unknownFields',
  'aliasedFields',
  'fileValidation',
  'rowsWithIssues',
  'parseMeta',
  'issuesSummary'
]

function extractPeristableReport(fullReport) {
  const persistableReport = pick(fullReport, REPORT_KEYS_TO_PERSIST)
  persistableReport.rowsWithIssues = take(
    fullReport.rowsWithIssues,
    1000
  )
  persistableReport.rowsWithIssuesCount = fullReport.rowsWithIssues.length
  return persistableReport
}

async function importData(url) {
  const resource = await fetchResource(url)
  const report = await validate(resource)
  const {normalizedRows, validatedRows} = report
  return {
    data: normalizedRows,
    errored: validatedRows.length - normalizedRows.length,
    report: extractPeristableReport(report)
  }
}

module.exports = {importData}
