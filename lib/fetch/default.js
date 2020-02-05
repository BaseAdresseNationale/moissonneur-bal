const got = require('got')
const Keyv = require('keyv')

const gotCache = new Keyv('sqlite://got.cache.sqlite')

async function fetchDefaultResource(url) {
  const response = await got(url, {cache: gotCache, responseType: 'buffer'})
  return response.body
}

module.exports = {fetchDefaultResource}
