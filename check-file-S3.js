#!/usr/bin/env node
require('dotenv').config()
const {S3Client, ListObjectsCommand} = require('@aws-sdk/client-s3')
const mongo = require('./lib/util/mongo')

const s3Client = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  },
  endpoint: process.env.S3_ENDPOINT
})

async function getAllObjectsFromS3Bucket() {
  const objectIds = []
  let isTruncated = true
  let marker

  while (isTruncated) {
    const params = {Bucket: process.env.S3_CONTAINER_ID}
    if (marker) {
      params.Marker = marker
    }

    // eslint-disable-next-line no-await-in-loop
    const response = await s3Client.send(new ListObjectsCommand(params))
    objectIds.push(...response.Contents.map(({Key}) => Key))
    isTruncated = response.IsTruncated
    if (isTruncated) {
      marker = response.Contents.slice(-1)[0].Key
    }

    console.log(objectIds.length)
  }

  return objectIds
}

async function main() {
  console.log('Upload files ids')
  const objectIds = await getAllObjectsFromS3Bucket()
  console.log('Check files ids')
  await mongo.connect()
  const filesCursor = await mongo.db.collection('files').find({})
  const total = await mongo.db.collection('files').estimatedDocumentCount()
  let count = 0

  for await (const file of filesCursor) {
    count++
    const fileId = file._id.toHexString()
    if (!objectIds.includes(fileId)) {
      console.log(`File ${fileId} No exist on S3`)
    }

    if (count % 100 === 0) {
      console.log(`${count} / ${total} files processed`)
    }
  }

  console.log(`${count} / ${total} files processed`)

  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
