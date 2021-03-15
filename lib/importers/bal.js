const {take} = require('lodash')
const {validate} = require('@etalab/bal')

function normalizeRow(row) {
  return {
    cle_interop: row.parsedValues.cle_interop,
    voie_nom: row.parsedValues.voie_nom,
    numero: row.parsedValues.numero,
    suffixe: row.parsedValues.suffixe,
    commune_nom: row.parsedValues.commune_nom,
    commune_insee: row.parsedValues.commune_insee || row.additionalValues.cle_interop.codeCommune,
    position: row.parsedValues.position,
    long: row.parsedValues.long,
    lat: row.parsedValues.lat,
    source: row.parsedValues.source,
    date_der_maj: row.parsedValues.date_der_maj
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
