const bluebird = require('bluebird')
const {mapValues, omit} = require('lodash')
const hasha = require('hasha')
const hashObject = require('../util/hash-object')
const {fetchHttpResource} = require('./http')
const {isOds, fetchOdsResource} = require('./ods')

async function fetchResource(url) {
  if (isOds(url)) {
    return fetchOdsResource(url)
  }

  return fetchHttpResource(url)
}

async function fetchResources(resourcesObj) {
  await bluebird.map(Object.keys(resourcesObj), async resourceName => {
    const definition = resourcesObj[resourceName]
    definition.data = await fetchResource(definition.url)
    definition.hash = await hasha.async(definition.data, {algorithm: 'sha256'})
  }, {concurrency: 8})
}

async function hashResources(resourcesObj) {
  const treeToHash = mapValues(resourcesObj, resource => omit(resource, 'data'))
  return hashObject(treeToHash)
}

module.exports = {fetchResource, fetchResources, hashResources}
