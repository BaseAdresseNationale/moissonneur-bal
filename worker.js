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
    name: 'mise à jour des sources de données',
    every: '5m',
    handler: updateSources
  },
  {
    name: 'nettoyage des moissonnages bloqués',
    every: '2m',
    handler: cleanStalledHarvests
  },
  {
    name: 'moissonnage automatique des sources (nouvelles et anciennes)',
    every: '1h',
    handler: harvestNewOrOutdated
  },
  {
    name: 'moissonnage à la demande',
    every: '30s',
    handler: harvestAsked
  }
]

async function main() {
  await mongo.connect()
  await updateSources()
  await harvestNewOrOutdated()

  jobsList.forEach(jobType => {
    setInterval(async () => {
      const now = new Date()
      console.log(`${now.toISOString().slice(0, 19)} | running job : ${jobType.name}`)
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
