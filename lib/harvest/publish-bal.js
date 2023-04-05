const process = require('process')
const Papa = require('papaparse')

const {getCurrentRevision, publishNewRevision} = require('../util/api-depot')

const {API_DEPOT_CLIENT_ID} = process.env

async function publishBal({sourceId, codeCommune, harvestId, nbRows, nbRowsWithErrors, validRows, uniqueErrors, organizationName}, options = {}) {
  if (!API_DEPOT_CLIENT_ID) {
    return {status: 'not-configured'}
  }

  const currentPublishedRevision = await getCurrentRevision(codeCommune)

  if (!options.force && currentPublishedRevision && currentPublishedRevision.client.id !== API_DEPOT_CLIENT_ID) {
    return {status: 'provided-by-other-client', currentClientId: currentPublishedRevision.client._id}
  }

  if (!options.force && currentPublishedRevision && currentPublishedRevision.context.extras.sourceId !== sourceId.toString()) {
    return {status: 'provided-by-other-source', currentSourceId: currentPublishedRevision.context.extras.sourceId}
  }

  try {
    const csvContent = Papa.unparse(validRows.map(r => r.rawValues), {delimiter: ';'})
    const balFile = Buffer.from(csvContent)

    const extras = {
      sourceId,
      harvestId,
      nbRows,
      nbRowsWithErrors,
      uniqueErrors
    }

    const publishedRevision = await publishNewRevision({codeCommune, extras, balFile, organizationName})
    return {status: 'published', publishedRevisionId: publishedRevision._id}
  } catch (error) {
    console.error(error)
    return {status: 'error', errorMessage: error.message}
  }
}

module.exports = publishBal
