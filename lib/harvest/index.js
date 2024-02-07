const Source = require('../models/source')
const {sendMessage} = require('../util/slack')

const processSource = require('./process-source')

async function harvestSource(sourceId) {
  const {source, harvest} = await Source.startHarvesting(sourceId)
  const {updateStatus, updateRejectionReason, fileId, fileHash, dataHash, error} = await processSource(source, harvest)

  if (error) {
    await Source.finishHarvesting(source._id, {status: 'failed', error})
    return
  }

  if (updateStatus === 'updated') {
    const message = `Mise à jour d’une Base Adresse Locale : *${source.title}*
_Moissonnage via ${source.type} :tractor:_`
    await sendMessage(message)
  }

  await Source.finishHarvesting(source._id, {
    status: 'completed',
    updateStatus,
    updateRejectionReason,
    fileId,
    fileHash,
    dataHash
  })
}

module.exports = {harvestSource}
