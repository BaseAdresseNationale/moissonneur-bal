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
