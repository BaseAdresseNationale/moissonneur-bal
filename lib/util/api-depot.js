const got = require('got')
const hasha = require('hasha')
const createError = require('http-errors')

const API_DEPOT_URL = process.env.API_DEPOT_URL || 'https://plateforme.adresse.data.gouv.fr/api-depot'
const {API_DEPOT_CLIENT_SECRET} = process.env

async function getCurrentRevision(codeCommune) {
  const response = await got(
    `${API_DEPOT_URL}/communes/${codeCommune}/current-revision`,
    {responseType: 'json', throwHttpErrors: false}
  )

  if (response.statusCode === 200) {
    return response.body
  }

  if (response.statusCode === 404) {
    return
  }

  throw new Error(response.body.message)
}

async function publishNewRevision({codeCommune, extras, balFile, organizationName}) {
  const defaultHeaders = {
    Authorization: `Token ${API_DEPOT_CLIENT_SECRET}`
  }

  const revision = await got.post(
    `${API_DEPOT_URL}/communes/${codeCommune}/revisions`,
    {
      json: {context: {extras, organisation: organizationName}},
      headers: defaultHeaders
    }
  ).json()

  await got.put(
    `${API_DEPOT_URL}/revisions/${revision._id}/files/bal`,
    {
      body: balFile,
      headers: {
        ...defaultHeaders,
        'Content-Type': 'application/csv',
        'Content-MD5': hasha(balFile, {algorithm: 'md5'})
      }
    }
  ).json()

  const computedRevision = await got.post(
    `${API_DEPOT_URL}/revisions/${revision._id}/compute`,
    {
      headers: defaultHeaders
    }
  ).json()

  if (!computedRevision.validation.valid) {
    console.log(computedRevision.validation.errors)
    throw createError(417, 'Fichier BAL non valide')
  }

  const publishedRevision = await got.post(
    `${API_DEPOT_URL}/revisions/${revision._id}/publish`,
    {
      headers: defaultHeaders
    }
  ).json()

  return publishedRevision
}

module.exports = {getCurrentRevision, publishNewRevision}
