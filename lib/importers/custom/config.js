const {join} = require('path')
const {readdirSync} = require('fs')
const {keyBy} = require('lodash')
const {readYamlFile} = require('../../util/yaml')

const importersPath = join(__dirname, '..', '..', '..', 'importers')

function getFunctions(importerName) {
  try {
    return require(join(importersPath, importerName))
  } catch {
    return {}
  }
}

function getConfig(importerName) {
  return readYamlFile(join(importersPath, importerName, 'config.yml'))
}

const importers = readdirSync(importersPath).map(importerName => {
  const functions = getFunctions(importerName)
  const config = getConfig(importerName)

  return {name: importerName, config, functions}
})

module.exports = keyBy(importers, 'name')
