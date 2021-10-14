const {promisify} = require('util')
const workerFarm = require('worker-farm')
const tmp = require('tmp-promise')
const {writeFile} = require('fs-extra')
const {registerFarm} = require('../../../util/farms')

const extractFarm = workerFarm(require.resolve('./worker'))
registerFarm(extractFarm)
const extract = promisify(extractFarm)

async function loadData(buffer, options) {
  const file = await tmp.file({postfix: '.shp.zip'})
  await writeFile(file.path, buffer)
  const features = await extract(`/vsizip/${file.path}`, options)
  return features.map(({properties, geometry}) => {
    return {...properties, _geometry: geometry}
  })
}

module.exports = {loadData}
