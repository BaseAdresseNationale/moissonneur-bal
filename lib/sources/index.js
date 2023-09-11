const {join} = require('path')
const {pick} = require('lodash')
const {readYamlFile} = require('../util/yaml')
const {getEligibleBALDatasets, getDataset, getOrganization, getBALUrl} = require('./datagouv')

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

  // ADD URL TO ENTRY
  if (!entry.url && !entry.converter && dataset) {
    entry.url = getBALUrl(dataset)
  }

  return {
    type: 'github',
    dataset,
    organization,
    ...entry
  }
}

function prepareEligibleEntry(dataset) {
  return {
    type: 'datagouv',
    dataset,
    organization: dataset.organization,
    url: getBALUrl(dataset)
  }
}

function computeLicense({odbl, dataset}) {
  if (odbl || (dataset && dataset.license === 'odc-odbl')) {
    return 'odc-odbl'
  }

  return 'lov2'
}

function computePage(source) {
  if (source.dataset) {
    return source.dataset.page
  }

  return source.homepage
}

function computeMetaFromSource(source) {
  return {
    _id: source.slug ? `slug-${source.slug}` : `datagouv-${source.dataset.id}`,
    title: source.name || source.dataset.title,
    type: source.type,
    description: source.dataset ? source.dataset.description : undefined,
    page: computePage(source),
    model: source.converter ? 'custom' : 'bal',
    converter: source.converter || undefined,
    license: computeLicense(source),
    url: source.url,
    organization: source.organization ? pick(source.organization, ['name', 'page', 'logo']) : undefined
  }
}

async function computeList() {
  const customSources = readYamlFile(sourcesFilePath)

  // CREATE BLACKLIST ID DATASET
  const blacklistedIds = customSources.blackList.map(e => e.dataset)
  // CREATE WHITELIST ID DATASET
  const whitelistedIds = customSources.whiteList.filter(e => e.dataset).map(e => e.dataset)
  // GET DATASETS FROM DATAGOUV
  const eligibleBALDatasets = await getEligibleBALDatasets()
  // FILTER DATASETS WITHOUT BLACKLISTE AND WHITELISTE
  const selectedDatasets = eligibleBALDatasets
    .filter(d => !blacklistedIds.includes(d.id) && !whitelistedIds.includes(d.id))
  // MIX WHITELIST AND DATAGOUV DATASETS
  const sources = [
    ...(await Promise.all(customSources.whiteList.map(source => augmentCustomEntry(source)))),
    ...(selectedDatasets.map(dataset => prepareEligibleEntry(dataset)))
  ]

  return sources.map(s => computeMetaFromSource(s))
}

module.exports = {computeList}
