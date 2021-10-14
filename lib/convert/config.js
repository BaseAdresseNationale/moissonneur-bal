const {join} = require('path')
const {readdirSync} = require('fs')
const {keyBy} = require('lodash')
const {readYamlFile} = require('../util/yaml')

const convertersPath = join(__dirname, '..', '..', 'converters')

function getFunctions(converterName) {
  try {
    return require(join(convertersPath, converterName))
  } catch {
    return {}
  }
}

function getConfig(converterName) {
  return readYamlFile(join(convertersPath, converterName, 'config.yml'))
}

const converters = readdirSync(convertersPath).map(converterName => {
  const functions = getFunctions(converterName)
  const config = getConfig(converterName)

  return {name: converterName, config, functions}
})

module.exports = keyBy(converters, 'name')
