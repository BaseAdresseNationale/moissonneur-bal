const {readFileSync} = require('fs')
const yaml = require('js-yaml')

function readYamlFile(path) {
  const fileContent = readFileSync(path, 'utf8')
  return yaml.load(fileContent)
}

module.exports = {readYamlFile}
