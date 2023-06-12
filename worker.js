#!/usr/bin/env node --max_old_space_size=8192
require('dotenv').config()

const ms = require('ms')

const mongo = require('./lib/util/mongo')
const {harvestNewOrOutdated} = require('./lib/worker/harvest-new-or-outdated')
const {harvestAsked} = require('./lib/worker/harvest-asked')
const {updateSources} = require('./lib/worker/update-sources')
const {cleanStalledHarvests} = require('./lib/worker/clean-stalled-harvests')

const jobsList = [
  {
    name: 'Mise à jour des sources de données',
    every: '5m',
    handler: updateSources
  },
  {
    name: 'Nettoyage des moissonnages bloqués',
    every: '2m',
    handler: cleanStalledHarvests
  },
  {
    name: 'Moissonnage automatique des sources (nouvelles et anciennes)',
    every: '1h',
    handler: harvestNewOrOutdated
  },
  {
    name: 'Moissonnage à la demande',
    every: '30s',
    handler: harvestAsked
  }
]

async function main() {
  await mongo.connect()
  console.log('Mise à jour des sources de données')
  await updateSources()
  console.log('Moissonnage automatique des sources (nouvelles et anciennes)')
  await harvestNewOrOutdated()

  jobsList.forEach(jobType => {
    setInterval(async () => {
      console.log(`Running job : ${jobType.name}`)
      try {
        await jobType.handler()
      } catch (error) {
        console.error(error)
      }
    }, ms(jobType.every))
  })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
