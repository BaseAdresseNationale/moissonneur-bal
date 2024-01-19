const {keyBy} = require('lodash')

const Harvest = require('../models/harvest')
const {fetchIfUpdated, resourceToArtefact} = require('../resources')

const handleNewFile = require('./handle-new-file')

async function processSource(source) {
  const activeHarvest = await Harvest.getActiveHarvest(source._id)
  const lastCompletedHarvest = await Harvest.getLastCompletedHarvest(source._id)
  const {fetchArtefacts: previousFetchArtefacts, fileId, fileHash, dataHash} = lastCompletedHarvest || {}
  const indexedFetchArtefacts = keyBy(previousFetchArtefacts, 'url')

  const result = {}
  let newFile
  let newFileHash

  try {
    const relatedFetchArtefact = indexedFetchArtefacts[source.url] || {}
    const resource = await fetchIfUpdated({...relatedFetchArtefact, url: source.url})

    result.fetchArtefacts = [resourceToArtefact(resource)]
    newFile = resource.data
    newFileHash = resource.hash

    if (newFile) {
      const handleNewFileResult = await handleNewFile({
        harvestId: activeHarvest._id,
        sourceId: source._id,
        newFile,
        newFileHash,
        currentFileId: fileId,
        currentFileHash: fileHash,
        currentDataHash: dataHash,
        organizationName: source.organization?.name
      })
      Object.assign(result, handleNewFileResult)
    } else {
      Object.assign(result, {updateStatus: 'unchanged', fileId, fileHash})
    }

    return result
  } catch (error) {
    console.log(`${source.title} - Impossible d’accéder aux adresses`)
    console.log(error.message)
    return {error: error.message}
  }
}

module.exports = processSource
