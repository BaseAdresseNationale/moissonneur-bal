/* eslint unicorn/require-post-message-target-origin: off */
const {WebClient} = require('@slack/web-api')

async function sendMessage(message) {
  if (!process.env.SLACK_TOKEN || !process.env.SLACK_CHANNEL) {
    return
  }

  const web = new WebClient(process.env.SLACK_TOKEN)
  return web.chat.postMessage({channel: process.env.SLACK_CHANNEL, text: message})
}

module.exports = {sendMessage}
