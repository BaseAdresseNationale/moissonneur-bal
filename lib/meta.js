const {union, featureCollection, feature} = require('@turf/turf')
const {pick, omit} = require('lodash')
const {getContourCommune} = require('./contours')

function createContour(codesCommunes) {
  const contoursCommunes = codesCommunes
    .filter(Boolean)
    .map(getContourCommune)
    .filter(Boolean)

  if (contoursCommunes.length === 0) {
    throw new Error('Impossible de construire le contour : communes inconnues')
  }

  if (contoursCommunes.length === 1) {
    return contoursCommunes[0].geometry
  }

  return union(...contoursCommunes).geometry
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
    description: source.dataset ? source.dataset.description : undefined,
    page: computePage(source),
    model: source.importer ? 'custom' : 'bal-aitf',
    license: computeLicense(source),
    url: source.url,
    organization: source.organization ? pick(source.organization, ['name', 'page', 'logo']) : undefined
  }
}

function expandMetaWithResults(meta, {tree, report, errored}) {
  meta.numerosCount = tree.numerosCount
  meta.communes = Object.keys(tree.communes)
  meta.contour = createContour(meta.communes)
  meta.dateMAJ = tree.dateMAJ
  if (report) {
    meta.isValid = report.isValid
  }

  meta.errored = errored
}

function exportAsGeoJSON(datasets) {
  return featureCollection(
    datasets.map(dataset => feature(dataset.contour, omit(dataset, 'contour')))
  )
}

module.exports = {createContour, computeMetaFromSource, expandMetaWithResults, exportAsGeoJSON}
