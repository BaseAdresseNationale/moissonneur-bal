#!/usr/bin/env node --max_old_space_size=8192
require('dotenv').config()

const ms = require('ms')

const mongo = require('./lib/util/mongo')
const {runWorkflow} = require('./lib/worker/run-workflow')
const {harvestRequestedSources} = require('./lib/worker/start-harvest')

const jobsList = [
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
