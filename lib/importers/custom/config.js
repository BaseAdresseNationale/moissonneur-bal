const {join} = require('path')
const {readYamlFile} = require('../../util/yaml')

const importersPath = join(__dirname, '..', '..', '..', 'importers')

function getFunctions(importer) {
  try {
    return require(`../../../importers/${importer}`)
  } catch {
    return {}
  }
}

function getConfig(importer) {
  return readYamlFile(join(importersPath, importer, 'config.yml'))
}

function expandSource(s) {
  if (s.importer) {
    s.functions = getFunctions(s.importer)
    s.config = getConfig(s.importer)
  }
}

module.exports = {expandSource}
