const {pick} = require('lodash')
const hasha = require('hasha')
const {fetchIfUpdatedHttp} = require('./http')

async function fetchIfUpdated(resource) {
  const result = await fetchIfUpdatedHttp(resource)

  if (result.data) {
    const hash = await hasha.async(result.data, {algorithm: 'sha256'})

    if (resource.hash === hash) {
      delete result.data
    } else {
      result.hash = hash
    }
  }

  return {
    ...resource,
    ...result
  }
}

async function fetchAllIfUpdated(resources) {
  const updatedResources = await Promise.all(
    resources.map(async resource => fetchIfUpdated(resource))
  )

  // Si aucune ressource ne contient d'attribut data, on renvoie le tableau à l'identique
  if (updatedResources.every(r => !r.data)) {
    return updatedResources
  }

  // Si toutes les ressources contients l'attribut data, on renvoie le tableau à l'identique
  if (updatedResources.every(r => r.data)) {
    return updatedResources
  }

  // Si certaines ressources contiennent l'attribut data et d'autres non, on complète
  return Promise.all(updatedResources.map(async resource => {
    if (resource.data) {
      return resource
    }

    return fetchIfUpdated({url: resource.url})
  }))
}

function resourceToArtefact(resource) {
  return pick(resource, 'url', 'hash', 'httpEtag', 'httpLastModified', 'odsModified')
}

module.exports = {fetchAllIfUpdated, fetchIfUpdated, resourceToArtefact}
