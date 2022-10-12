const ms = require('ms')

const {runWorkflow} = require('../worker/run-workflow')

const jobsList = [
  {
    name: 'lancement du workflow',
    every: '1h',
    async handler() {
      await runWorkflow()
    }
  }
]

function startJobs(jobs) {
  jobs.forEach(job => {
    setInterval(() => {
      const now = new Date()
      console.log(`${now.toISOString().slice(0, 19)} | running job : ${job.name}`)
      job.handler()
    }, ms(job.every))
  })
}

module.exports = {
  jobsList,
  startJobs
}
