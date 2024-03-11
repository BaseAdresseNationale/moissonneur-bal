const mongo = require('../util/mongo')

async function fetchAll() {
  return mongo.db.collection('organizations').find().toArray()
}

async function fetch(organizationId) {
  return mongo.db.collection('organizations').findOne({_id: organizationId})
}

async function upsert(organization) {
  await mongo.db.collection('organizations').updateOne(
    {_id: organization.id},
    {
      $set: {
        name: organization.name,
        page: organization.page,
        logo: organization.logo,
        _updated: new Date(),
        _deleted: false,
      },
      $setOnInsert: {
        _id: organization.id,
        perimeters: [],
        _created: new Date(),
      },
    },
    {upsert: true}
  )
}

async function update(organizationId, {perimeters}) {
  const updateResult = await mongo.db.collection('organizations').updateOne(
    {_id: organizationId},
    {
      $set: {
        perimeters,
        _updated: new Date(),
      }
    },
    {upsert: true}
  )
  return updateResult
}

async function softDeleteInactive(activeIds) {
  await mongo.db.collection('organizations').updateMany(
    {_id: {$nin: activeIds}, _deleted: false},
    {$set: {_deleted: true, _updated: new Date()}}
  )
}

module.exports = {
  fetch,
  fetchAll,
  upsert,
  update,
  softDeleteInactive
}
