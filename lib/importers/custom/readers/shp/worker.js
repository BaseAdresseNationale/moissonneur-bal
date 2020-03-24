const gdal = require('gdal-next')
const {mapValues, isPlainObject} = require('lodash')

const wgs84 = gdal.SpatialReference.fromProj4('+init=epsg:4326')

function gdalLayerToGeoJSONFeatures(gdalLayer, transform) {
  return gdalLayer.features.map(feature => {
    const properties = feature.fields.toObject()
    const geometry = feature.getGeometry()

    if (geometry && transform) {
      geometry.transform(transform)
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

function extractGeoJSONFeatures(gdalPath) {
  const dataset = gdal.open(gdalPath)
  const layer = dataset.layers.get(0)
  const transform = layer.srs.isSame(wgs84) ?
    null :
    new gdal.CoordinateTransformation(
      layer.srs,
      wgs84
    )
  return gdalLayerToGeoJSONFeatures(layer, transform)
}

module.exports = function (gdalPath, cb) {
  try {
    cb(null, extractGeoJSONFeatures(gdalPath))
  } catch (error) {
    cb(error)
  }
}
