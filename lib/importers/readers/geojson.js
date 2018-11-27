const iconv = require('iconv-lite')
const stripBom = require('strip-bom-buf')

function getEncoding(encoding) {
  if (!encoding) {
    return 'utf8'
  }
  if (encoding === 'latin1') {
    return 'win1252'
  }
  return encoding
}

function loadData(buffer, options = {}) {
  const encoding = getEncoding(options.encoding)
  const string = iconv.decode(stripBom(buffer), encoding)
  const {features} = JSON.parse(string)
  return features.map(({properties, geometry}) => ({...properties, _geometry: geometry}))
}

module.exports = {loadData}
