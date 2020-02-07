const got = require('got')
const Keyv = require('keyv')

const gotCache = new Keyv('sqlite://got.cache.sqlite')

async function fetchDefaultResource(url) {
  // Disable cache mechanism for datasud.fr as HTTP headers are invalid
  const cacheOptions = url.includes('datasud.fr') ? {} : {cache: gotCache}

  const response = await got(url, {...cacheOptions, responseType: 'buffer'})
  return response.body
}

module.exports = {fetchDefaultResource}
