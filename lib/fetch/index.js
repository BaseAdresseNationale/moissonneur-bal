const {fetchDefaultResource} = require('./default')
const {isOds, fetchOdsResource} = require('./ods')

async function fetchResource(url) {
  if (isOds(url)) {
    return fetchOdsResource(url)
  }

  return fetchDefaultResource(url)
}

module.exports = {fetchResource}
