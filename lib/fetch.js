const got = require('got')
const Keyv = require('keyv')

const cache = new Keyv(process.env.RESOURCE_CACHE_KEYV_PATH || 'sqlite://.resource-cache.sqlite')

async function fetchResource(url) {
  const cacheEntry = await cache.get(url)
  if (cacheEntry) {
    return cacheEntry
  }

  const response = await got(url, {responseType: 'buffer'})
  await cache.set(url, response.body)
  return response.body
}

module.exports = {fetchResource}
