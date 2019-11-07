const got = require('got')
const {chain} = require('lodash')

function isCertified(organization) {
  const {badges} = organization

  return badges.some(b => b.kind === 'certified') &&
    badges.some(b => b.kind === 'public-service')
}

function isBAL(resource) {
  return resource.format === 'csv' || resource.url.endsWith('csv')
}

const organizationsCache = {}

async function getOrganization(organizationId) {
  if (!(organizationId in organizationsCache)) {
    const response = await got(`https://www.data.gouv.fr/api/1/organizations/${organizationId}/`, {json: true})
    organizationsCache[organizationId] = response.body
  }

  return organizationsCache[organizationId]
}

const datasetsCache = {}

async function getDataset(datasetId) {
  if (!(datasetId in datasetsCache)) {
    const response = await got(`https://www.data.gouv.fr/api/1/datasets/${datasetId}/`, {json: true})
    datasetsCache[datasetId] = response.body
  }

  return datasetsCache[datasetId]
}

async function getEligibleBALDatasets() {
  const response = await got('https://www.data.gouv.fr/api/1/datasets/?tag=base-adresse-locale&page_size=100', {json: true})

  // Register in datasets cache
  response.body.data.forEach(dataset => {
    datasetsCache[dataset.id] = dataset
  })

  const datasets = await Promise.all(
    response.body.data
      .filter(d => d.resources.some(isBAL) && d.organization)
      .map(async d => {
        const organization = await getOrganization(d.organization.id)
        return {...d, organization}
      })
  )

  return datasets.filter(d => isCertified(d.organization))
}

function getBALUrl(dataset) {
  const mostRecentResource = chain(dataset.resources)
    .filter(isBAL)
    .sortBy('last_modified')
    .reverse()
    .value()[0]

  return mostRecentResource.url
}

module.exports = {getEligibleBALDatasets, getOrganization, getDataset, getBALUrl}
