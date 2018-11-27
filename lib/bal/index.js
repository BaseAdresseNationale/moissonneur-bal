const {validate} = require('@etalab/bal')
const {fetchResource} = require('../fetch')

async function importData(url) {
  const resource = await fetchResource(url)
  const report = await validate(resource)
  const {normalizedRows, validatedRows} = report
  return {data: normalizedRows, errored: validatedRows.length - normalizedRows.length}
}

module.exports = {importData}
