const {join} = require('path')
const {pick} = require('lodash')
const convertConfig = require('../convert/config')
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

  if (!entry.url && !entry.converter && dataset) {
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
    id: source.slug || source.dataset.id,
    title: source.name || source.dataset.title,
    source: source.source,
    description: source.dataset ? source.dataset.description : undefined,
    page: computePage(source),
    model: source.converter ? 'custom' : 'bal',
    license: computeLicense(source),
    url: source.url,
    organization: source.organization ? pick(source.organization, ['name', 'page', 'logo']) : undefined
  }
}

async function computeList() {
  const customSources = readYamlFile(sourcesFilePath)

  const blacklistedIds = customSources.blackList.map(e => e.dataset)
  const whitelistedIds = customSources.whiteList.filter(e => e.dataset).map(e => e.dataset)

  const eligibleBALDatasets = (await getEligibleBALDatasets())
    .filter(d => !blacklistedIds.includes(d.id) && !whitelistedIds.includes(d.id))

  const sources = [
    ...(await Promise.all(customSources.whiteList.map(source => augmentCustomEntry(source)))),
    ...(eligibleBALDatasets.map(dataset => prepareEligibleEntry(dataset)))
  ]

  sources.forEach(s => {
    s.meta = computeMetaFromSource(s)
    delete s.dataset
    delete s.organization

    // For BAL
    if (s.url) {
      s.resources = {
        default: {url: s.url}
      }
    } else {
      s.resources = convertConfig[s.converter].config.resources
    }
  })

  return sources
}

module.exports = {computeList}
