const {createWriteStream} = require('fs')
const csvWriter = require('csv-write-stream')
const {pick} = require('lodash')
const pumpify = require('pumpify')
const through = require('through2').obj

const CSV_HEADERS = [
  'id',
  'codeCommune',
  'nomCommune',
  'codeVoie',
  'nomVoie',
  'numero',
  'suffixe',
  'lon',
  'lat'
]

function asCsv(row) {
  const result = pick(row, CSV_HEADERS)
  if (row.position) {
    result.lon = row.position[0]
    result.lat = row.position[1]
  }
  return result
}

function createCSVWriteStream(path) {
  return pumpify.obj(
    through((row, enc, cb) => {
      cb(null, asCsv(row))
    }),
    csvWriter({separator: ';', headers: CSV_HEADERS}),
    createWriteStream(path)
  )
}

module.exports = {createCSVWriteStream}
