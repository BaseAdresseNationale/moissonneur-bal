const got = require('got')
const Keyv = require('@livingdata/keyv')

const httpCache = new Keyv('sqlite://http.cache.sqlite')

function getPreconditionHeaders(cacheEntry) {
  if (!cacheEntry) {
    return {}
  }

  const headers = {}

  if (cacheEntry.lastModified) {
    headers['if-modified-since'] = cacheEntry.lastModified
  }

  if (cacheEntry.etag) {
    headers['if-none-match'] = cacheEntry.etag
  }

  return headers
}

async function fetchHttpResource(url) {
  const cacheEntry = await httpCache.get(url)
  const headers = getPreconditionHeaders(cacheEntry)
  const response = await got(url, {responseType: 'buffer', timeout: 300000, headers})

  if (response.statusCode === 304) {
    return cacheEntry.data
  }

  if (response.statusCode !== 200) {
    throw new Error('Not valid response code: ' + response.statusCode)
  }

  if (!response.body || response.body.length === 0) {
    throw new Error('Empty body')
  }

  await httpCache.delete(url)

  if (response.headers['last-modified'] || response.headers.etag) {
    const newCacheEntry = {
      data: response.body
    }

    if (response.headers['last-modified']) {
      newCacheEntry.lastModified = response.headers['last-modified']
    }

    if (response.headers.etag) {
      newCacheEntry.etag = response.headers.etag
    }

    await httpCache.set(url, newCacheEntry)
  }

  return response.body
}

module.exports = {fetchHttpResource}
