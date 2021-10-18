const {promisify} = require('util')
const {MongoClient, GridFSBucket, ObjectId} = require('mongodb')
const intoStream = require('into-stream')
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

  async createIndexes() {}

  async disconnect(force) {
    return this.client.close(force)
  }
}

module.exports = new Mongo()
module.exports.ObjectId = ObjectId
