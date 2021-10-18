#!/usr/bin/env node
require('dotenv').config()

const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const createError = require('http-errors')

const mongo = require('./lib/util/mongo')
const w = require('./lib/util/w')
const errorHandler = require('./lib/util/error-handler')

const Source = require('./lib/models/source')

async function main() {
  const app = express()

  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'))
  }

  app.use(cors({origin: true}))

  app.get('/sources', w(async (req, res) => {
    const sources = await Source.getSummary()
    res.send(sources)
  }))

  app.get('/sources/:sourceId', w(async (req, res) => {
    const source = await Source.getSource(req.params.sourceId)

    if (!source) {
      throw createError(404, 'Source non trouvée')
    }

    res.send(source)
  }))

  app.use(errorHandler)

  await mongo.connect()

  const port = process.env.PORT || 5000
  app.listen(port, () => {
    console.log(`Start listening on port ${port}`)
  })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
