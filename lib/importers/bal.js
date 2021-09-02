const {validate} = require('@etalab/bal')

async function importData(source) {
  const {data} = source.resources.default
  const report = await validate(data)
  const {rows} = report

  return {
    originalFile: data,
    rows,
    report: {...report, rows: undefined}
  }
}

module.exports = {importData}
