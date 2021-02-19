const {take} = require('lodash')
const {validate} = require('@etalab/bal')

function normalizeRow(row) {
  return {
    id: row.parsedValues.cle_interop,
    cleInterop: row.parsedValues.cle_interop,
    nomVoie: row.parsedValues.voie_nom,
    numero: row.parsedValues.numero,
    suffixe: row.parsedValues.suffixe,
    nomCommune: row.parsedValues.commune_nom,
    codeCommune: row.additionalValues.cle_interop.codeCommune,
    position: row.parsedValues.position,
    lon: row.parsedValues.long,
    lat: row.parsedValues.lat,
    source: row.parsedValues.source,
    dateMAJ: row.parsedValues.date_der_maj
  }
}

async function importData(source) {
  const {data} = source.resources.default
  const report = await validate(data)
  const {rows} = report
  return {
    data: rows.filter(r => r.isValid).map(row => normalizeRow(row)),
    errored: rows.filter(r => !r.isValid).length,
    report: {
      ...report,
      rows: take(report.rows.filter(r => r.errors.length > 0), 1000)
    }
  }
}

module.exports = {importData}
