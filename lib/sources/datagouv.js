const got = require('got')
const {chain} = require('lodash')

const URL_API_DATA_GOUV = process.env.URL_API_DATA_GOUV || 'https://www.data.gouv.fr/api/1'
const PAGE_SIZE = 100
const TAG = 'base-adresse-locale'
const FORMAT = 'csv'

function isCertified(organization) {
  const {badges} = organization

  return badges.some(b => b.kind === 'certified')
    && badges.some(b => b.kind === 'public-service')
}

function isCSV(resource) {
  return resource.format === 'csv' || resource.url.endsWith('csv')
}

function getBALUrl(dataset) {
  const mostRecentResource = chain(dataset.resources)
    .filter(r => isCSV(r))
    .sortBy('last_modified')
    .reverse()
    .value()[0]

  return mostRecentResource.url
}

async function getDatasets(page = 1) {
  const url = `${URL_API_DATA_GOUV}/datasets/?tag=${TAG}&format=${FORMAT}&page_size=${PAGE_SIZE}&page=${page}`
  const options = {
    responseType: 'json',
    headers: {
      'X-fields': 'total,data{id,title,description,archived,license,organization{name,page,logo,badges},resources{id,format,url,last_modified}}'
    }
  }

  const response = await got(url, options)
  // FILTER DATASETS
  const datasets = response.body.data
    .filter(d => d.resources.some(r => isCSV(r)) && d.organization && !d.archived && isCertified(d.organization))

  if (response.body.total > page * PAGE_SIZE) {
    return [...datasets, ...await getDatasets(page + 1)]
  }

  return datasets
}

module.exports = {getDatasets, getBALUrl}
