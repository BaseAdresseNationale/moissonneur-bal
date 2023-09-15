const got = require('got')
const {chain} = require('lodash')

const URL_API_BETA_GOUV = process.env.URL_API_BETA_GOUV || 'https://www.data.gouv.fr/api/1'
const BAL_ADMIN_API_URL = process.env.BAL_ADMIN_API_URL || 'https://bal-admin.adresse.data.gouv.fr/api'
const PAGE_SIZE = 100
const TAG = 'base-adresse-locale'
const FORMAT = 'csv'

// CREATE INTERNE CACHE
const organizationsCache = {}
const datasetsCache = {}

async function getOrganization(organizationId) {
  if (!(organizationId in organizationsCache)) {
    const response = await got(`${URL_API_BETA_GOUV}/organizations/${organizationId}/`, {responseType: 'json'})
    organizationsCache[organizationId] = response.body
  }

  return organizationsCache[organizationId]
}

async function getDataset(datasetId) {
  if (!(datasetId in datasetsCache)) {
    const response = await got(`${URL_API_BETA_GOUV}/datasets/${datasetId}/`, {responseType: 'json'})
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
  return URL_API_BETA_GOUV
    + '/datasets/'
    + `/?tag=${TAG}`
    + `&format=${FORMAT}`
    + `&page_size=${PAGE_SIZE}`
    + `&page=${page}`
}

async function fetchDatasets(partnersIds, page = 1) {
  const url = computeBetaGouvDatasetsUrl(page)
  const response = await got(url, {responseType: 'json'})

  // FILTER DATASETS
  const datasets = response.body.data
    .filter(d => d.resources.some(r => isBAL(r)) && d.organization && !d.archived && isCertified(d.organization) && partnersIds.includes(d.organization.slug))

  if (response.body.total > page * PAGE_SIZE) {
    return [...datasets, ...await fetchDatasets(partnersIds, page + 1)]
  }

  return datasets
}

async function getPartnersDataGouvOrganizationIds() {
  const partners = await got(`${BAL_ADMIN_API_URL}/partenaires-de-la-charte?withoutPictures=true`, {responseType: 'json'})
  const partnersIds = partners.body
    .filter(p => Boolean(p.dataGouvOrganizationId))
    .map(p => p.dataGouvOrganizationId)

  return partnersIds
}

async function getEligibleBALDatasets() {
  // FETCH PARTNERS DATA GOUV ORGANIZATION IDS FROM BAL ADMIN
  const dataGouvPartnersIds = await getPartnersDataGouvOrganizationIds()
  // GET DATASET
  const datasets = await fetchDatasets(dataGouvPartnersIds)
  // BUILD CACHES
  datasets.forEach(dataset => {
    datasetsCache[dataset.id] = dataset
  })

  return datasets
}

module.exports = {getEligibleBALDatasets, getOrganization, getDataset, getBALUrl}
