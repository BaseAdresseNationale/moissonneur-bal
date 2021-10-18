const {promisify} = require('util')
const {MongoClient, GridFSBucket, ObjectId} = require('mongodb')
const intoStream = require('into-stream')
const createError = require('http-errors')
const contentDisposition = require('content-disposition')
const finished = promisify(require('stream').finished)

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost'
const MONGODB_DBNAME = process.env.MONGODB_DBNAME || 'moissonneur-bal'

class Mongo {
  async connect() {
    if (this.db) {
      return
    }

    this.client = new MongoClient(MONGODB_URL)
    await this.client.connect()

    this.db = this.client.db(MONGODB_DBNAME)
    this.bucket = new GridFSBucket(this.db)

    await this.createIndexes()
  }

  async writeFileBuffer(buffer, filename, metadata = {}) {
    const _id = new ObjectId()
    const writeStream = this.bucket.openUploadStreamWithId(_id, filename, {metadata})
    intoStream(buffer).pipe(writeStream)
    await finished(writeStream)
    return {_id, filename, metadata}
  }

  async sendFile(fileId, res) {
    const _id = this.parseObjectID(fileId)

    if (!_id) {
      throw createError(400, 'Identifiant invalide')
    }

    const fileRecord = await this.db.collection('fs.files').findOne({_id})

    if (!fileRecord) {
      throw createError(404, 'Fichier non trouvé')
    }

    res.set('Content-Disposition', contentDisposition(fileRecord.filename))
    res.set('Content-Length', fileRecord.length)
    this.bucket.openDownloadStream(_id).pipe(res)
  }

  async createIndexes() {
    await this.db.collection('harvests').createIndex({sourceId: 1})
    await this.db.collection('harvests').createIndex({sourceId: 1, createdAt: 1})
  }

  async disconnect(force) {
    return this.client.close(force)
  }

  parseObjectID(string) {
    try {
      return new ObjectId(string)
    } catch {
      return null
    }
  }
}

module.exports = new Mongo()
module.exports.ObjectId = ObjectId
