const Stairs = require('@busbud/stairs')
const Stdbot = require('stdbot')
const Slack = require('stdbot-slack')

Stairs({
  floors: process.env.STAIRS_FLOORS,
  floorHeight: process.env.STAIRS_FLOOR_HEIGHT,
  botName: process.env.BOT_NAME,
  db: process.env.DATABASE_URL,
  adapter: Stdbot(Slack({
    token: process.env.SLACK_TOKEN,
    channels: process.env.SLACK_CHANNELS.split(','),
    direct: true,
    threaded: true,
    threadedBroadcast: true
  }))
})
