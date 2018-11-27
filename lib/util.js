const {readFile} = require('fs-extra')
const yaml = require('js-yaml')

async function readYamlFile(path) {
  const fileContent = await readFile(path, 'utf8')
  return yaml.safeLoad(fileContent)
}

module.exports = {readYamlFile}
