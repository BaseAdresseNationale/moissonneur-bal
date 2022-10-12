#!/usr/bin/env node --max_old_space_size=8192
require('dotenv').config()

const mongo = require('./lib/util/mongo')
const {endFarms} = require('./lib/util/farms')
const {runWorkflow} = require('./lib/worker/run-workflow')
const {jobsList, startJobs} = require('./lib/util/jobs')

async function main() {
  await mongo.connect()
  await runWorkflow()
  startJobs(jobsList)
}

main().catch(error => {
  console.error(error)
  endFarms()
  process.exit(1)
})
