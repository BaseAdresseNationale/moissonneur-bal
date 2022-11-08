const mongo = require('../util/mongo')

async function create(revision) {
  await mongo.db.collection('communes_revisions').insertOne({
    _id: new mongo.ObjectId(),
    ...revision
  })
}

async function update(revisionId, changes) {
  await mongo.db.collection('communes_revisions').updateOne(
    {_id: revisionId},
    {$set: {...changes}}
  )
}

async function getRevisionByCommune(codeCommune) {
  return mongo.db.collection('communes_revisions').findOne({codeCommune})
}

module.exports = {create, update, getRevisionByCommune}
