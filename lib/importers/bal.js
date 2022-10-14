const {take} = require('lodash')
const {validate} = require('@ban-team/validateur-bal')

function normalizeRow(row) {
  return {
    id: row.parsedValues.cle_interop,
    uidAdresse: row.parsedValues.uid_adresse,
    cleInterop: row.parsedValues.cle_interop,
    nomVoie: row.parsedValues.voie_nom,
    lieuDitComplementNom: row.parsedValues.lieudit_complement_nom,
    numero: row.parsedValues.numero,
    suffixe: row.parsedValues.suffixe,
    nomCommune: row.parsedValues.commune_nom,
    codeCommune: row.parsedValues.commune_insee || row.additionalValues.cle_interop.codeCommune,
    typePosition: row.parsedValues.position,
    lon: row.parsedValues.long,
    lat: row.parsedValues.lat,
    source: row.parsedValues.source,
    dateMAJ: row.parsedValues.date_der_maj,
    parcelles: row.parsedValues.cad_parcelles || [],
    certificationCommune: row.parsedValues.certification_commune,
    nomVoieAlt: row.localizedValues.voie_nom,
    lieuDitComplementNomAlt: row.localizedValues.lieudit_complement_nom
  }
}

async function importData(source) {
  const {data} = source.resources.default
  const report = await validate(data, {relaxFieldsDetection: true})
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
