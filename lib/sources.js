const {join} = require('path')
const got = require('got')
const {readYamlFile} = require('./util/yaml')
const {getEligibleBALDatasets, getDataset, getOrganization, getBALUrl} = require('./datagouv')

const sourcesFilePath = join(__dirname, '..', 'sources.yml')

async function augmentCustomEntry(entry) {
  let dataset
  let organization

  if (entry.dataset) {
    dataset = await getDataset(entry.dataset)
  }

  if (entry.organization || (dataset && dataset.organization)) {
    organization = await getOrganization(entry.organization || dataset.organization.id)
  }

  if (!entry.url && !entry.importer && dataset) {
    return {...entry, dataset, organization, url: getBALUrl(dataset)}
  }

  return {...entry, dataset, organization}
}

function prepareEligibleEntry(dataset) {
  return {
    dataset,
    organization: dataset.organization,
    url: getBALUrl(dataset)
  }
}

async function getPublishedDatasets() {
  const response = await got('https://backend.adresse.data.gouv.fr/publication/submissions/published', {responseType: 'json'})
  return response.body.map(entry => ({
    slug: `bal-${entry._id}`,
    url: entry.url,
    name: `Adresses de ${entry.commune.nom}`
  }))
}

async function computeList() {
  const sources = await readYamlFile(sourcesFilePath)

  const blacklistedIds = sources.blackList.map(e => e.dataset)
  const whitelistedIds = sources.whiteList.filter(e => e.dataset).map(e => e.dataset)

  const eligibleBALDatasets = (await getEligibleBALDatasets())
    .filter(d => !blacklistedIds.includes(d.id) && !whitelistedIds.includes(d.id))

  return [
    ...(await Promise.all(sources.whiteList.map(augmentCustomEntry))),
    ...(eligibleBALDatasets.map(prepareEligibleEntry)),
    ...(await getPublishedDatasets())
  ]
}

module.exports = {computeList, getPublishedDatasets}
