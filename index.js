const Stairs = require('@busbud/stairs')
const Stdbot = require('stdbot')
const Flowdock = require('stdbot-flowdock')

Stairs({
  floors: process.env.STAIRS_FLOORS,
  db: process.env.DATABASE_URL,
  adapter: Stdbot(Flowdock({
    flows: process.env.FLOWDOCK_FLOWS.split(','),
    token: process.env.FLOWDOCK_TOKEN
  }))
})
