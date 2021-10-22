const {join} = require('path')
const got = require('got')
const {uniqBy} = require('lodash')
const importersConfig = require('../importers/custom/config')
const {readYamlFile} = require('../util/yaml')
const {getCommune} = require('../cog')
const {getEligibleBALDatasets, getDataset, getOrganization, getBALUrl} = require('./datagouv')
const {computeMetaFromSource} = require('./meta')

const rootPath = join(__dirname, '..', '..')
const sourcesFilePath = join(rootPath, 'sources.yml')

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

  return {
    ...entry,
    source: 'github',
    dataset,
    organization
  }
}

function prepareEligibleEntry(dataset) {
  return {
    source: 'datagouv',
    dataset,
    organization: dataset.organization,
    url: getBALUrl(dataset)
  }
}

async function getPublishedDatasets() {
  const response = await got('https://backend.adresse.data.gouv.fr/publication/submissions/published', {responseType: 'json'})
  return response.body.map(entry => {
    const url = entry.url ? entry.url : `https://backend.adresse.data.gouv.fr/publication/submissions/${entry._id}/data`
    return {
      slug: `bal-${entry.commune.code}`,
      commune: entry.commune.code,
      source: 'api',
      url,
      name: `Adresses de ${entry.commune.nom}`
    }
  })
}

async function getCurrentRevisions() {
  const response = await got('https://plateforme.adresse.data.gouv.fr/api-depot/current-revisions', {responseType: 'json'})
  return response.body.map(({codeCommune}) => ({
    slug: `bal-${codeCommune}`,
    commune: codeCommune,
    source: 'api',
    url: `https://plateforme.adresse.data.gouv.fr/api-depot/communes/${codeCommune}/current-revision/files/bal/download`,
    name: `Adresses de ${getCommune(codeCommune).nom}`
  }))
}

async function computeList() {
  const customSources = readYamlFile(sourcesFilePath)

  const blacklistedIds = customSources.blackList.map(e => e.dataset)
  const whitelistedIds = customSources.whiteList.filter(e => e.dataset).map(e => e.dataset)

  const eligibleBALDatasets = (await getEligibleBALDatasets())
    .filter(d => !blacklistedIds.includes(d.id) && !whitelistedIds.includes(d.id))

  const harvestSources = [
    ...(await Promise.all(customSources.whiteList.map(source => augmentCustomEntry(source)))),
    ...(eligibleBALDatasets.map(dataset => prepareEligibleEntry(dataset)))
  ]

  const apiSources = [
    ...(await getCurrentRevisions()),
    ...(await getPublishedDatasets())
  ]

  const sources = [
    ...harvestSources,
    ...uniqBy(apiSources, 'slug')
  ]

  sources.forEach(s => {
    s.meta = computeMetaFromSource(s)

    // For BAL
    if (s.url) {
      s.resources = {
        default: {url: s.url}
      }
    } else {
      s.resources = importersConfig[s.importer].config.resources
    }
  })

  return sources
}

module.exports = {computeList, getPublishedDatasets}
