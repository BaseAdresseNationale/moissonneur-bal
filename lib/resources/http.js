const got = require('got')

function getPreconditionHeaders({httpLastModified, httpEtag}) {
  const headers = {}

  if (httpLastModified) {
    headers['if-modified-since'] = httpLastModified
  }

  if (httpEtag) {
    headers['if-none-match'] = httpEtag
  }

  return headers
}

async function fetchIfUpdatedHttp({url, httpLastModified, httpEtag}) {
  const headers = getPreconditionHeaders({httpLastModified, httpEtag})
  const response = await got(url, {responseType: 'buffer', timeout: 300000, headers})

  if (response.statusCode === 304) {
    return {httpLastModified, httpEtag}
  }

  if (response.statusCode !== 200) {
    throw new Error('Not valid response code: ' + response.statusCode)
  }

  if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
    throw new Error('Not valid content-type: ' + response.headers['content-type'])
  }

  if (!response.body || response.body.length === 0) {
    throw new Error('Empty body')
  }

  return {
    data: response.body,
    httpLastModified: response.headers['last-modified'],
    httpEtag: response.headers.etag
  }
}

module.exports = {fetchIfUpdatedHttp}
