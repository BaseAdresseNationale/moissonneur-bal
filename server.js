#!/usr/bin/env node
require('dotenv').config()

const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const createError = require('http-errors')

const mongo = require('./lib/util/mongo')
const w = require('./lib/util/w')
const errorHandler = require('./lib/util/error-handler')

const Harvest = require('./lib/models/harvest')
const Source = require('./lib/models/source')
const Revision = require('./lib/models/revision')

const {ADMIN_TOKEN} = process.env

async function main() {
  const app = express()
  app.use(express.json())

  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'))
  }

  app.use(cors({origin: true}))

  function ensureIsAdmin(req, res, next) {
    const isAdmin = req.get('Authorization') === `Token ${ADMIN_TOKEN}`

    if (!ADMIN_TOKEN || !isAdmin) {
      throw createError(403, 'Non autorisé')
    }

    next()
  }

  app.param('sourceId', w(async (req, res, next) => {
    const source = await Source.getSource(req.params.sourceId)

    if (!source) {
      throw createError(404, 'Source non trouvée')
    }

    req.source = source
    next()
  }))

  app.param('harvestId', w(async (req, res, next) => {
    const harvestId = mongo.parseObjectID(req.params.harvestId)

    if (!harvestId) {
      throw createError(404, 'Identifiant non valide')
    }

    const harvest = await Harvest.getHarvest(harvestId)

    if (!harvest) {
      throw createError(404, 'Moissonnage non trouvé')
    }

    req.harvest = harvest
    next()
  }))

  app.param('revisionId', w(async (req, res, next) => {
    const revisionId = mongo.parseObjectID(req.params.revisionId)

    if (!revisionId) {
      throw createError(404, 'Identifiant non valide')
    }

    const revision = await Revision.getRevision(revisionId)

    if (!revision) {
      throw createError(404, 'Révision non trouvée')
    }

    req.revision = revision
    next()
  }))

  app.post('/sources/:sourceId/harvest', ensureIsAdmin, w(async (req, res) => {
    if (req.source.harvesting.asked) {
      throw createError(404, 'Moissonnage déjà demandé')
    }

    if (!req.source.enabled) {
      throw createError(404, 'Source inactive')
    }

    if (req.source._deleted) {
      throw createError(404, 'La source est supprimée')
    }

    const source = await Source.askHarvest(req.source._id)

    res.status(202).send(source)
  }))

  app.get('/sources/:sourceId/harvests', w(async (req, res) => {
    const response = await Harvest.getHarvests(req.source._id, req.query)
    res.send(response)
  }))

  app.get('/sources', w(async (req, res) => {
    const sources = await Source.getSummary()
    res.send(sources)
  }))

  app.get('/sources/:sourceId', w(async (req, res) => {
    res.send(req.source)
  }))

  app.put('/sources/:sourceId', ensureIsAdmin, w(async (req, res) => {
    const source = await Source.update(req.source._id, req.body)

    res.send(source)
  }))

  app.get('/sources/:sourceId/current-revisions', w(async (req, res) => {
    const revisions = await Revision.getCurrentRevisions(req.source._id)
    res.send(revisions)
  }))

  app.get('/harvests/:harvestId', w(async (req, res) => {
    res.send(req.harvest)
  }))

  app.get('/harvests/:harvestId/revisions', w(async (req, res) => {
    const revisions = await Revision.getRevisions(req.harvest._id)
    res.send(revisions)
  }))

  app.get('/revisions/:revisionId', (req, res) => {
    res.send(req.revision)
  })

  app.post('/revisions/:revisionId/publish', ensureIsAdmin, w(async (req, res) => {
    const revision = await Revision.publish(req.revision, {force: req.body.force})
    res.send(revision)
  }))

  app.get('/files/:fileId/download', w(async (req, res) => {
    await mongo.sendFile(req.params.fileId, res)
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
