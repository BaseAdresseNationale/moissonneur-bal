const {trim} = require('lodash')
const got = require('got')
const Keyv = require('keyv')

const gotCache = new Keyv('sqlite://got.cache.sqlite')
const odsCache = new Keyv('sqlite://ods.cache.sqlite')

function isODS(url) {
  return url.includes('/explore/dataset') && url.includes('/download') && url.includes('format=')
}

async function getODSInfo(url) {
  const parsedUrl = new URL(url)
  const datasetId = trim(parsedUrl.pathname, '/').split('/')[2]
  const metadataUrl = `${parsedUrl.origin}/api/datasets/1.0/${datasetId}`
  const response = await got(metadataUrl, {responseType: 'json'})
  return response.body
}

async function fetchOdsResource(url) {
  const metadata = await getODSInfo(url)
  const {modified} = metadata.metas
  const cacheEntry = await odsCache.get(url)

  if (cacheEntry && cacheEntry.modified === modified) {
    return cacheEntry.data
  }

  const response = await got(url, {responseType: 'buffer'})
  odsCache.set(url, {data: response.body, modified})
  return response.body
}

async function fetchDefaultResource(url) {
  const response = await got(url, {cache: gotCache, responseType: 'buffer'})
  return response.body
}

async function fetchResource(url) {
  if (isODS(url)) {
    return fetchOdsResource(url)
  }

  return fetchDefaultResource(url)
}

module.exports = {fetchResource}
