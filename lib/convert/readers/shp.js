const {mapValues, isPlainObject, uniqueId} = require('lodash')
const gdal = require('gdal-async')

const wgs84 = gdal.SpatialReference.fromProj4('+init=epsg:4326')

async function gdalLayerToGeoJSONFeatures(gdalLayer, transform) {
  const resultFeatures = []

  for await (const feature of gdalLayer.features) {
    const properties = feature.fields.toObject()
    const geometry = feature.getGeometry()

    if (geometry && transform) {
      await geometry.transform(transform)
    }

    resultFeatures.push({
      type: 'Feature',
      properties: mapValues(properties, v => {
        if (isPlainObject(v) && v.year && v.month && v.day) {
          return `${v.year.toString()}-${v.month.toString().padStart(2, '0')}-${v.day.toString().padStart(2, '0')}`
        }

        return v
      }),
      geometry: geometry && geometry.toObject()
    })
  }

  return resultFeatures
}

async function extractGeoJSONFeatures(gdalPath, {encoding, fromEPSG}) {
  gdal.config.set('SHAPE_ENCODING', encoding) // If options.encoding is undefined, the config setting is unset
  const dataset = gdal.open(gdalPath)
  const layer = dataset.layers.get(0)
  const transform = layer.srs.isSame(wgs84)
    ? null
    : new gdal.CoordinateTransformation(
      fromEPSG ? gdal.SpatialReference.fromProj4(`+init=epsg:${fromEPSG}`) : layer.srs,
      wgs84
    )
  return gdalLayerToGeoJSONFeatures(layer, transform)
}

async function loadData(buffer, options) {
  const vsimemPath = `/vsimem/${uniqueId('dataset-')}.shp.zip`
  gdal.vsimem.set(buffer, vsimemPath)
  const features = await extractGeoJSONFeatures(vsimemPath, options)
  gdal.vsimem.release(vsimemPath)
  return features.map(({properties, geometry}) => {
    return {...properties, _geometry: geometry}
  })
}

module.exports = {loadData}
