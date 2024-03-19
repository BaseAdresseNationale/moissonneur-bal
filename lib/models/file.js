const createError = require('http-errors')
const mongo = require('../util/mongo')
const s3Service = require('../files/s3.service')

async function writeFile(buffer, filename, metadata = {}) {
  const _id = new mongo.ObjectId()
  try {
    // SAVE BUFFER IN S3
    await s3Service.uploadS3File(_id.toHexString(), buffer)

    // SAVE FILE META IN MONGO
    const file = {_id, filename, ...metadata}
    await mongo.db.collection('files').insertOne(file)

    return {_id, filename, ...metadata}
  } catch (error) {
    console.error(error)
    throw createError(400, `<<FILE>> Fichier non uploadé ${filename}, ${_id}`)
  }
}

async function getFile(fileId) {
  // CHECK ID VALID
  const _id = mongo.parseObjectID(fileId)
  if (!_id) {
    throw createError(400, 'Identifiant invalide')
  }

  // CHECK ID IN MONGO
  const fileMeta = await mongo.db.collection('files').findOne({_id})
  if (!fileMeta) {
    throw new Error('<<FILE>> Fichier non trouvé dans la collection files')
  }

  // CHECK ID IN S3
  const fileS3Exist = await s3Service.checkS3FileExists(_id.toHexString())
  if (!fileS3Exist) {
    throw new Error('<<FILE>> Fichier non trouvé sur S3')
  }

  // GET BUFFER FILE
  const data = await s3Service.getS3File(_id.toHexString())

  // CREATE AND RETURN OBJECT FILE
  const file = {...fileMeta, data}

  return file
}

module.exports = {writeFile, getFile}
