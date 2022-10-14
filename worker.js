#!/usr/bin/env node --max_old_space_size=8192
require('dotenv').config()

const ms = require('ms')

const mongo = require('./lib/util/mongo')
const {runWorkflow} = require('./lib/worker/run-workflow')
const {harvestRequestedSources} = require('./lib/worker/start-harvest')
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
    name: 'lancement du workflow',
    every: '1h',
    async handler() {
      await runWorkflow()
    }
  },
  {
    name: 'recherche sources à moissonner',
    every: '30s',
    async handler() {
      await harvestRequestedSources()
    }
  }
]

async function main() {
  await mongo.connect()
  await runWorkflow()

  jobsList.forEach(jobType => {
    setInterval(() => {
      const now = new Date()
      console.log(`${now.toISOString().slice(0, 19)} | running job : ${jobType.name}`)
      jobType.handler()
    }, ms(jobType.every))
  })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
