const test = require('ava')
const {validate} = require('@ban-team/validateur-bal')

const {getErrorPercentage} = require('../validate-file')

const csvFile = `uid_adresse;cle_interop;commune_insee;commune_nom;voie_nom;numero;suffixe;position;x;y;long;lat;cad_parcelles;source;date_der_maj;certification_commune
;81289_0049_00043;81289;Soual;Avenue de Mazamet;43;;entrée;1628923.02370024;3151042.93249989;2.12029074610781;43.5559286436393;810289000AC0255;Commune de Soual;2020-04-02;1
;81289_0058_00006;81289;Soual;Place du Parc;6;;entrée;1628630.9770999;3150896.4369998;2.11669582154773;43.5545820022032;810289000AC0379;Commune de Soual;2020-03-31;1`

const csvFileWithError = `uid_adresse;cle_interop;commune_insee;commune_nom;voie_nom;numero;suffixe;position;x;y;long;lat;cad_parcelles;source;date_der_maj;certification_commune
;;812892;Soual;Avenue de Mazamet;43;;entrée;1628923.02370024;3151042.93249989;2.12029074610781;43.5559286436393;810289000AC0255;Commune de Soual;2020-04-02;1
;;81289;Soual;Place du Parc;6;;entrée;1628630.9770999;3150896.4369998;2.11669582154773;43.5545820022032;810289000AC0379;Commune de Soual;2020-03-31;1`

test('validate CSV file', async t => {
  const result = await validate(Buffer.from(csvFile), {relaxFieldsDetection: true})
  const percentageError = getErrorPercentage(result)

  t.is(percentageError, 0)
})

test('validate CSV file / errors', async t => {
  const result = await validate(Buffer.from(csvFileWithError), {relaxFieldsDetection: true})
  const percentageError = getErrorPercentage(result)

  t.is(percentageError, 50)
})
