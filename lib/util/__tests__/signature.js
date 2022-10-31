const test = require('ava')
const {signRow, signData} = require('../signature')

const rowA = {
  cad_parcelles: '810289000AC0255',
  certification_commune: '1',
  cle_interop: '',
  commune_insee: '81289',
  commune_nom: 'Soual',
  date_der_maj: '2020-04-02',
  lat: '43.5559286436393',
  long: '2.12029074610781',
  numero: '43',
  position: 'entrée',
  source: 'Commune de Soual',
  suffixe: '',
  uid_adresse: '',
  voie_nom: 'Avenue de Mazamet',
  x: '1628923.02370024',
  y: '3151042.93249989',
}

const mixedRowA = {
  y: '3151042.93249989',
  position: 'entrée',
  numero: '43',
  cle_interop: '',
  commune_nom: 'Soual',
  date_der_maj: '2020-04-02',
  source: 'Commune de Soual',
  uid_adresse: '',
  long: '2.12029074610781',
  commune_insee: '81289',
  certification_commune: '1',
  suffixe: '',
  voie_nom: 'Avenue de Mazamet',
  x: '1628923.02370024',
  cad_parcelles: '810289000AC0255',
  lat: '43.5559286436393',
}

const rowB = {
  cad_parcelles: '810289000AC0379',
  certification_commune: '1',
  cle_interop: '',
  commune_insee: '81289',
  commune_nom: 'Soual',
  date_der_maj: '2020-03-31',
  lat: '43.5545820022032',
  long: '2.11669582154773',
  numero: '6',
  position: 'entrée',
  source: 'Commune de Soual',
  suffixe: '',
  uid_adresse: '',
  voie_nom: 'Place du Parc',
  x: '1628630.9770999',
  y: '3150896.4369998',
}

const mixedRowB = {
  x: '1628630.9770999',
  y: '3150896.4369998',
  commune_insee: '81289',
  commune_nom: 'Soual',
  position: 'entrée',
  cad_parcelles: '810289000AC0379',
  long: '2.11669582154773',
  numero: '6',
  source: 'Commune de Soual',
  suffixe: '',
  uid_adresse: '',
  voie_nom: 'Place du Parc',
  cle_interop: '',
  certification_commune: '1',
  date_der_maj: '2020-03-31',
  lat: '43.5545820022032',
}

test('sign row', t => {
  const signedRowA = signRow(rowA)
  const signedRowB = signRow(rowB)
  const signedMixedRowA = signRow(mixedRowA)
  const signedMixedRowB = signRow(mixedRowB)

  t.is(signedRowA, 'd6c2ade9f35fb0eba6923348af364bd4')
  t.is(signedRowB, '308b17b6c35379fc61968de63fcfa02c')
  t.is(signedRowA, signedMixedRowA)
  t.is(signedRowB, signedMixedRowB)
})

test('sign data', t => {
  const signedDataA = signData([rowA, rowB])
  const signedDataB = signData([rowB, rowA])
  const signedMixedDataA = signData([mixedRowA, mixedRowB])
  const signedMixedDataB = signData([mixedRowB, mixedRowA])
  const signedMixedDataC = signData([mixedRowA, rowB])
  const signedMixedDataD = signData([rowB, mixedRowA])
  const signedMixedDataE = signData([mixedRowB, rowA])
  const signedMixedDataF = signData([rowA, mixedRowB])

  t.is(signedDataA, '6ed52d10b1686b001fabc88a35db39ba9a8f2e9d05d431637aa6afe220dbbaa9')
  t.is(signedDataA, signedDataB)
  t.is(signedDataA, signedMixedDataA)
  t.is(signedDataA, signedMixedDataB)
  t.is(signedDataA, signedMixedDataC)
  t.is(signedDataA, signedMixedDataD)
  t.is(signedDataA, signedMixedDataE)
  t.is(signedDataA, signedMixedDataF)
})
