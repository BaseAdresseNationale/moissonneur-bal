#!/usr/bin/env node
require('dotenv').config()

const mongo = require('../lib/util/mongo')

async function main() {
  await mongo.connect()

  await mongo.db.collection('fs.files').drop()
  await mongo.db.collection('fs.chunks').drop()

  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
