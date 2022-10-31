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

const data = [
  rowA,
  rowB
]

const mixedData = [
  {
    cad_parcelles: '810289000AC0379',
    cle_interop: '',
    certification_commune: '1',
    commune_insee: '81289',
    lat: '43.5545820022032',
    long: '2.11669582154773',
    commune_nom: 'Soual',
    numero: '6',
    suffixe: '',
    date_der_maj: '2020-03-31',
    position: 'entrée',
    uid_adresse: '',
    source: 'Commune de Soual',
    voie_nom: 'Place du Parc',
    y: '3150896.4369998',
    x: '1628630.9770999',
  },
  {
    cad_parcelles: '810289000AC0255',
    cle_interop: '',
    commune_insee: '81289',
    lat: '43.5559286436393',
    commune_nom: 'Soual',
    date_der_maj: '2020-04-02',
    long: '2.12029074610781',
    source: 'Commune de Soual',
    certification_commune: '1',
    numero: '43',
    position: 'entrée',
    x: '1628923.02370024',
    uid_adresse: '',
    suffixe: '',
    voie_nom: 'Avenue de Mazamet',
    y: '3151042.93249989',
  }
]

test('sign row', t => {
  const signedRowA = signRow(rowA)
  const signedRowB = signRow(rowB)
  const signedMixedRowA = signRow(mixedRowA)
  const signedMixedRowB = signRow(mixedRowB)

  t.is(signedRowA, '286d11a823c3747b3ad25f79c3f63b289ba0a457be929bc16704bb08f66a7b7ed772cda440b86a524274940651db1df3fbd9a5446ff1cff69e447be4461637b4')
  t.is(signedRowB, '512d73e63c5d2c3f4b5d6b9980c017feb16c67c084a86317d1b7da9f58d7b6bd4f9a07b31fa8cd67ed38ab0264a7471dcc85fe068b8f4d7e0a8c2182e45bace7')
  t.is(signedRowA, signedMixedRowA)
  t.is(signedRowB, signedMixedRowB)
})

test('sign data', t => {
  const signedData = signData(data)
  const signedMixedData = signData(mixedData)

  t.is(signedData, '8cd2d676af60bd8ac3bd4ea06b89a919313b2d96ac416ec4bdd301ae4600a1346b3a00d7be5331f29b3c63d91a62624a364686098354152883eb3e08fcf1c81d')
  t.is(signedData, signedMixedData)
})
