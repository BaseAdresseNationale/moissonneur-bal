const {trim} = require('lodash')
const got = require('got')

function isOds(url) {
  return url?.includes('/explore/dataset') && url?.includes('/download') && url?.includes('format=')
}

async function getODSInfo(url) {
  const parsedUrl = new URL(url)
  const datasetId = trim(parsedUrl.pathname, '/').split('/')[2]
  const metadataUrl = `${parsedUrl.origin}/api/datasets/1.0/${datasetId}`
  const response = await got(metadataUrl, {responseType: 'json'})
  return response.body
}

async function fetchIfUpdatedOds({url, odsModified}) {
  const metadata = await getODSInfo(url)
  const {modified} = metadata.metas

  if (modified === odsModified) {
    return {odsModified}
  }

  const response = await got(url, {responseType: 'buffer'})
  return {odsModified: modified, data: response.body}
}

module.exports = {isOds, fetchIfUpdatedOds}
