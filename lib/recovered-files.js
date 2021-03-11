const got = require('got')
const {getCommune} = require('./cog')

async function getRecoveredFiles() {
  const response = await got('https://adresse.data.gouv.fr/data/sbg-recovery/index.json', {responseType: 'json'})
  return response.body.map(codeCommune => {
    const commune = getCommune(codeCommune)
    return {
      slug: `bal-${codeCommune}`,
      url: `https://adresse.data.gouv.fr/data/sbg-recovery/${codeCommune}.csv`,
      name: `Adresses de ${commune.nom}`
    }
  })
}

module.exports = {getRecoveredFiles}
