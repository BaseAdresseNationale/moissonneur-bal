const Papa = require('papaparse')
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
  const {data} = Papa.parse(string, {header: true, skipEmptyLines: true})
  return data
}

module.exports = {loadData}
