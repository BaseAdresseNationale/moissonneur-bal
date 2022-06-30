const {trim} = require('lodash')
const got = require('got')
const Keyv = require('keyv')

const odsCache = new Keyv('sqlite://ods.cache.sqlite')

function isOds(url) {
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

module.exports = {isOds, fetchOdsResource}
