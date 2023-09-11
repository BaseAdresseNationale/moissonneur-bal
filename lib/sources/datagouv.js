const got = require('got')
const {chain} = require('lodash')

const URL_API_DATA_GOUV = process.env.URL_API_DATA_GOUV || 'https://www.data.gouv.fr/api/1'
const PAGE_SIZE = 100
const TAG = 'base-adresse-locale'
const FORMAT = 'csv'

// CREATE INTERNE CACHE
const organizationsCache = {}
const datasetsCache = {}

async function getOrganization(organizationId) {
  if (!(organizationId in organizationsCache)) {
    const response = await got(`${URL_API_DATA_GOUV}/organizations/${organizationId}/`, {responseType: 'json'})
    organizationsCache[organizationId] = response.body
  }

  return organizationsCache[organizationId]
}

async function getDataset(datasetId) {
  if (!(datasetId in datasetsCache)) {
    const response = await got(`${URL_API_DATA_GOUV}/datasets/${datasetId}/`, {responseType: 'json'})
    datasetsCache[datasetId] = response.body
  }

  return datasetsCache[datasetId]
}

function isCertified(organization) {
  const {badges} = organization

  return badges.some(b => b.kind === 'certified')
    && badges.some(b => b.kind === 'public-service')
}

function isBAL(resource) {
  return resource.format === 'csv' || resource.url.endsWith('csv')
}

function getBALUrl(dataset) {
  const mostRecentResource = chain(dataset.resources)
    .filter(r => isBAL(r))
    .sortBy('last_modified')
    .reverse()
    .value()[0]

  return mostRecentResource.url
}

function computeBetaGouvDatasetsUrl(page) {
  return URL_API_DATA_GOUV
    + '/datasets/'
    + `/?tag=${TAG}`
    + `&format=${FORMAT}`
    + `&page_size=${PAGE_SIZE}`
    + `&page=${page}`
}

async function fetchDatasets(page = 1) {
  const url = computeBetaGouvDatasetsUrl(page)
  const response = await got(url, {responseType: 'json'})

  // FILTER DATASETS
  const datasets = response.body.data
    .filter(d => d.resources.some(r => isBAL(r)) && d.organization && !d.archived && isCertified(d.organization))

  if (response.body.total > page * PAGE_SIZE) {
    return [...datasets, ...await fetchDatasets(page + 1)]
  }

  return datasets
}

async function getEligibleBALDatasets() {
  // GET DATASET
  const datasets = await fetchDatasets()
  // BUILD CACHES
  datasets.forEach(dataset => {
    datasetsCache[dataset.id] = dataset
  })

  return datasets
}

module.exports = {getEligibleBALDatasets, getOrganization, getDataset, getBALUrl}
