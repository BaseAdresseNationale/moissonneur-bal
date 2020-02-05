const iconv = require('iconv-lite')
const stripBom = require('strip-bom-buf')
const proj4 = require('proj4')

function getEncoding(encoding) {
  if (!encoding) {
    return 'utf8'
  }

  if (encoding === 'latin1') {
    return 'win1252'
  }

  return encoding
}

function createProj(fromEPSG) {
  if (!fromEPSG) {
    return x => x
  }

  const projFn = proj4(require('epsg-index/s/' + fromEPSG + '.json').proj4, 'EPSG:4326')
  return x => ({type: 'Point', coordinates: projFn.forward(x.coordinates)})
}

function loadData(buffer, options = {}) {
  const encoding = getEncoding(options.encoding)
  const string = iconv.decode(stripBom(buffer), encoding)
  const {features} = JSON.parse(string)
  const proj = createProj(options.fromEPSG)
  return features.map(({properties, geometry}) => ({...properties, _geometry: proj(geometry)}))
}

module.exports = {loadData}
