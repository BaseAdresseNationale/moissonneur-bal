const {MongoClient, ObjectId} = require('mongodb')

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

    await this.createIndexes()
  }

  async createIndexes() {}

  async disconnect(force) {
    return this.client.close(force)
  }
}

module.exports = new Mongo()
module.exports.ObjectId = ObjectId
