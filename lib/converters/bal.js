async function importData(source) {
  const {data} = source.resources.default

  return {
    originalFile: data
  }
}

module.exports = {importData}
