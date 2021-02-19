const {promisify} = require('util')
const {Transform} = require('stream')
const {createWriteStream} = require('fs')
const {createGzip} = require('zlib')
const csvWriter = require('csv-write-stream')
const {pick} = require('lodash')
const pumpify = require('pumpify')
const finished = promisify(require('end-of-stream'))
const {getCodeDepartement} = require('../cog')

const CSV_HEADERS = [
  'id',
  'codeCommune',
  'nomCommune',
  'idVoie',
  'codeVoie',
  'nomVoie',
  'numero',
  'suffixe',
  'lon',
  'lat'
]

function asCsv(row) {
  return pick(row, CSV_HEADERS)
}

function createCSVWriteStream(path) {
  return pumpify.obj(
    new Transform({
      transform(row, enc, cb) {
        cb(null, asCsv(row))
      },
      objectMode: true
    }),
    csvWriter({separator: ';', headers: CSV_HEADERS}),
    createGzip(),
    createWriteStream(path)
  )
}

function createCsvFilesWriter(path) {
  const csvFiles = {}

  function getCsvFile(codeDepartement) {
    if (!(codeDepartement in csvFiles)) {
      csvFiles[codeDepartement] = createCSVWriteStream(`${path}/adresses-locales-${codeDepartement}.csv.gz`)
    }

    return csvFiles[codeDepartement]
  }

  function writeRow(row) {
    const codeDepartement = getCodeDepartement(row.codeCommune)
    getCsvFile(codeDepartement).write(row)
  }

  async function finish() {
    await Promise.all(Object.values(csvFiles).map(async csvFile => {
      csvFile.end()
      await finished(csvFile)
    }))
  }

  return {writeRow, finish}
}

module.exports = {createCsvFilesWriter}
