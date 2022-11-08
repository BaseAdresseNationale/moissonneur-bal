const mongo = require('../util/mongo')

async function writeFile(file, filename, meta) {
  return mongo.writeFileBuffer(file, filename, meta)
}

module.exports = {writeFile}
