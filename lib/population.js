const {join} = require('path')
const Papa = require('papaparse')
const {readFile} = require('fs-extra')

const POPULATION_FILE_PATH = join(__dirname, '..', 'data', 'population.csv')

async function loadPopulation() {
  const file = await readFile(POPULATION_FILE_PATH, 'utf8')
  const {data} = Papa.parse(file, {header: true})
  return data.reduce((acc, item) => {
    const codeCommune = item['Code département'].substr(0, 2) + item['Code commune']
    acc[codeCommune] = Number.parseInt(item['Population municipale'].replace(/\s/g, ''), 10)
    return acc
  }, {})
}

module.exports = {loadPopulation}
