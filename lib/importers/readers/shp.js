const gdal = require('gdal')
const parseSrs = require('srs').parse
const {mapValues, isPlainObject} = require('lodash')
const tmp = require('tmp-promise')
const {writeFile} = require('fs-extra')

const wgs84 = gdal.SpatialReference.fromEPSG(4326)

function gdalLayerToGeoJSONFeatures(gdalLayer, transformToWGS84 = false) {
  return gdalLayer.features.map(feature => {
    const properties = feature.fields.toObject()
    const geometry = feature.getGeometry()
    if (geometry && transformToWGS84) {
      geometry.transformTo(wgs84)
    }
    return {
      type: 'Feature',
      properties: mapValues(properties, v => {
        if (isPlainObject(v) && v.year && v.month && v.day) {
          return `${v.year.toString()}-${v.month.toString().padStart(2, '0')}-${v.day.toString().padStart(2, '0')}`
        }
        return v
      }),
      geometry: geometry && geometry.toObject()
    }
  })
}

function getSrsName(gdalLayer) {
  if (!gdalLayer.srs) {
    return
  }
  const parsedSrs = parseSrs(gdalLayer.srs.toWKT())
  if (parsedSrs.name && parsedSrs !== 'unnamed') {
    return parsedSrs.name
  }
}

function extractGeoJSONFeatures(gdalPath) {
  const dataset = gdal.open(gdalPath)
  const layer = dataset.layers.get(0)
  const isWGS84 = getSrsName(layer) === 'WGS 84'
  return gdalLayerToGeoJSONFeatures(layer, !isWGS84)
}

async function loadData(buffer) {
  const file = await tmp.file({postfix: '.shp.zip'})
  await writeFile(file.path, buffer)
  const features = await extractGeoJSONFeatures(`/vsizip/${file.path}`)
  return features.map(({properties, geometry}) => {
    return {...properties, _geometry: geometry}
  })
}

module.exports = {loadData}
