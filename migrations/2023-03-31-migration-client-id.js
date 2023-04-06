#!/usr/bin/env node
require('dotenv').config()

const got = require('got')
const mongo = require('../lib/util/mongo')

const API_DEPOT_URL = process.env.API_DEPOT_URL || 'https://plateforme.adresse.data.gouv.fr/api-depot'
const {API_DEPOT_ADMIN_TOKEN} = process.env

async function getClients() {
  const response = await got.get(
    `${API_DEPOT_URL}/clients`,
    {
      headers: {Authorization: `Token ${API_DEPOT_ADMIN_TOKEN}`},
      responseType: 'json',
      throwHttpErrors: false
    }
  )

  if (response.statusCode === 200) {
    return response.body
  }

  throw new Error(response.body.message)
}

async function main() {
  await mongo.connect()

  const clients = await getClients()
  const clientsWithLegacyId = clients.filter(client => Boolean(client.id))

  await Promise.all(clientsWithLegacyId.map(async client => {
    const result = await mongo.db.collection('revisions').updateMany({'publication.currentClientId': client.id}, {$set: {'publication.currentClientId': client._id}})

    if (result.modifiedCount > 0) {
      console.log(`- ${result.modifiedCount} révisions modifiées -> Client ${client.nom}: ${client.id} => ${client._id}`)
    }
  }))

  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
