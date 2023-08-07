const {promisify} = require('util')
const {MongoClient, ObjectId, GridFSBucket} = require('mongodb')
const finished = promisify(require('stream').finished)
const getStream = require('get-stream')
const intoStream = require('into-stream')

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

  async writeFile(_id, buffer, filename, metadata) {
    const writeStream = this.bucket.openUploadStreamWithId(_id, filename, {metadata})
    intoStream(buffer).pipe(writeStream)
    await finished(writeStream)
  }

  async getFile(fileId) {
    const fileRecord = await this.db.collection('fs.files').findOne({_id: fileId})

    if (!fileRecord) {
      throw new Error('Fichier introuvable')
    }

    const data = await getStream.buffer(this.bucket.openDownloadStream(fileId))

    return {...fileRecord, data}
  }

  async createIndexes() {
    await this.db.collection('harvests').createIndex({sourceId: 1})
    await this.db.collection('harvests').createIndex({sourceId: 1, createdAt: 1})
    await this.db.collection('revisions').createIndex({harvestId: 1})
    await this.db.collection('revisions').createIndex({sourceId: 1, codeCommune: 1})
    await this.db.collection('revisions').createIndex({sourceId: 1, current: 1})
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
