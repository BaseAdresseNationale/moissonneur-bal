const bluebird = require('bluebird')
const {mapValues, omit} = require('lodash')
const hasha = require('hasha')
const stringify = require('json-stable-stringify')
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
    definition.hash = await hasha.async(definition.data, {algorithm: 'sha256'})
    console.timeEnd(`    fetching ${resourceName}`)
  })
}

async function hashResources(resourcesObj) {
  const treeToHash = mapValues(resourcesObj, resource => omit(resource, 'data'))
  return hasha(stringify(treeToHash))
}

module.exports = {fetchResource, fetchResources, hashResources}
