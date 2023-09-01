#!/usr/bin/env node

require('dotenv').config()
const fs = require('fs')
const mongo = require('../lib/util/mongo')
const s3Service = require('../lib/files/s3.service')

async function main() {
  await mongo.connect()

  const filesCursor = await mongo.db.collection('fs.files').find({})
  const total = await mongo.db.collection('fs.files').estimatedDocumentCount()
  let lastProcessedFileId = null

  try {
    lastProcessedFileId = fs.readFileSync('./last-processed-id', 'utf8')
  } catch {
    console.log('No last-processed-id file found, starting from the beginning')
  }

  let count = 0

  for await (const file of filesCursor) {
    count++

    console.log(`Processing file : ${count} / ${total}`)

    const fileId = file._id.toHexString()
    const fileToProcess = await mongo.getFile(file._id)

    if (lastProcessedFileId && lastProcessedFileId !== fileId) {
      console.log('Last processed ID doesn\'t match, continue')
      continue
    } else if (lastProcessedFileId === fileId) {
      console.log('Last processed ID matches')
      lastProcessedFileId = null
    }

    fs.writeFileSync('./last-processed-id', fileId)

    if (!fileToProcess.data) {
      console.log(`Error : No data found for file ${fileId}, continue`)
      continue
    }

    const fileAlreadyExistsInS3 = fileId && await s3Service.checkS3FileExists(fileId)
    const fileAlreadyExistsInMetadata = fileId && await mongo.db.collection('files').findOne({_id: file._id})

    if (fileAlreadyExistsInMetadata) {
      console.log(`Metadata already exists for file ${fileId}`)
    } else {
      console.log(`Writing metadata for file ${fileId}`)
      await mongo.db.collection('files').insertOne({
        _id: file._id,
        filename: file.filename,
        sourceId: file.metadata.sourceId,
        harvestId: file.metadata.harvestId,
        fileHash: file.metadata.fileHash,
        dataHash: file.metadata.dataHash,
      })
    }

    if (fileAlreadyExistsInS3) {
      console.log(`File ${fileId} already exists in S3`)
    } else {
      console.log(`Uploading CSV file for file ${fileId}`)
      await s3Service.uploadS3File(fileId, fileToProcess.data)
      console.log(`Upload OK, ${count} / ${total} files processed`)
    }
  }

  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
