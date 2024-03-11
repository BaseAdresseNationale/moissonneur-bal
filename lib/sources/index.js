const {join} = require('path')
const {readFileSync} = require('fs')
const {pick, keyBy} = require('lodash')
const DataGouv = require('./datagouv')

const rootPath = join(__dirname, '..', '..')
const sourcesBlackListFilePath = join(rootPath, 'sources-black-list.json')

function getBlackLists() {
  const fileContent = readFileSync(sourcesBlackListFilePath, 'utf8')
  return JSON.parse(fileContent)
}

function transformDatasetToSource(dataset) {
  return {
    _id: `datagouv-${dataset.id}`,
    title: dataset.title,
    type: 'datagouv',
    description: dataset.description || undefined,
    page: dataset.page,
    model: 'bal',
    license: dataset.license === 'odc-odbl' ? 'odc-odbl' : 'lov2',
    url: DataGouv.getBALUrl(dataset),
    organization: dataset.organization ? pick(dataset.organization, ['id', 'name', 'page', 'logo']) : undefined,
  }
}

async function computeList() {
  // GET DATASETS FROM DATAGOUV
  const datasets = await DataGouv.getDatasets()
  // FILTER DATASETS WITHOUT BLACKLISTE
  const blacksLists = await getBlackLists()
  const filteredDatasets = datasets
    .filter(({id}) => !blacksLists.some(blackList => blackList.id === id))
  // TRANSFORM DATASET IN SOURCE
  const sources = filteredDatasets.map(dataset => transformDatasetToSource(dataset))
  const organizations = Object.values(keyBy(filteredDatasets.map(d => d.organization), 'id'))
  return {
    sources,
    organizations
  }
}

module.exports = {computeList}
