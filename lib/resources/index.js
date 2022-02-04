const bluebird = require('bluebird')
const {mapValues, omit, pick} = require('lodash')
const hasha = require('hasha')
const stringify = require('json-stable-stringify')
const {fetchHttpResource} = require('./http')
const {isOds, fetchOdsResource} = require('./ods')

async function fetchResource(url, options) {
  if (isOds(url)) {
    return fetchOdsResource(url)
  }

  return fetchHttpResource(url, options)
}

async function fetchResources(resourcesObj) {
  await bluebird.map(Object.keys(resourcesObj), async resourceName => {
    const definition = resourcesObj[resourceName]
    const options = pick(definition, 'rejectUnauthorized')
    definition.data = await fetchResource(definition.url, options)
    definition.hash = await hasha.async(definition.data, {algorithm: 'sha256'})
  }, {concurrency: 8})
}

async function hashResources(resourcesObj) {
  const treeToHash = mapValues(resourcesObj, resource => omit(resource, 'data'))
  return hasha(stringify(treeToHash))
}

module.exports = {fetchResource, fetchResources, hashResources}
