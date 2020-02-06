const bluebird = require('bluebird')
const {fetchDefaultResource} = require('./default')
const {isOds, fetchOdsResource} = require('./ods')

async function fetchResource(url) {
  if (isOds(url)) {
    return fetchOdsResource(url)
  }

  return fetchDefaultResource(url)
}

async function fetchResources(resourcesObj) {
  await bluebird.mapSeries(Object.keys(resourcesObj), async resourceName => {
    const definition = resourcesObj[resourceName]
    console.time(`    fetching ${resourceName}`)
    definition.data = await fetchResource(definition.url)
    console.timeEnd(`    fetching ${resourceName}`)
  })
}

module.exports = {fetchResource, fetchResources}
