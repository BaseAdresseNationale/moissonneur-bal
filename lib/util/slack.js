/* eslint unicorn/require-post-message-target-origin: off */
const {WebClient} = require('@slack/web-api')

async function notify(result) {
  if (!process.env.SLACK_TOKEN || !process.env.SLACK_CHANNEL) {
    return
  }

  const web = new WebClient(process.env.SLACK_TOKEN)

  const text = `Consolidation des Bases Adresses Locales :fire:
- ${result.balCount} bases adresses locales
- ${result.communesCount} communes couvertes
- ${result.adressesCount} adresses acceptées
- ${result.erroredAdressesCount} adresses en erreur`

  return web.chat.postMessage({channel: process.env.SLACK_CHANNEL, text})
}

module.exports = {notify}
