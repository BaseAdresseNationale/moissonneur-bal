const got = require('got')
const hasha = require('hasha')

async function fetchHttp(url) {
  const response = await got(url, {responseType: 'buffer', timeout: 300000})

  if (response.statusCode !== 200) {
    throw new Error('Not valid response code: ' + response.statusCode)
  }

  if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
    throw new Error('Not valid content-type: ' + response.headers['content-type'])
  }

  if (!response.body || response.body.length === 0) {
    throw new Error('Empty body')
  }

  const hash = await hasha.async(response.body, {algorithm: 'sha256'})

  return {
    hash,
    data: response.body
  }
}

module.exports = {fetchHttp}
