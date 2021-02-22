const {pick} = require('lodash')

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
    description: source.dataset ? source.dataset.description : undefined,
    page: computePage(source),
    model: source.importer ? 'custom' : 'bal',
    license: computeLicense(source),
    url: source.url,
    organization: source.organization ? pick(source.organization, ['name', 'page', 'logo']) : undefined
  }
}

module.exports = {computeMetaFromSource}
