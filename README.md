# [Stairway to Heaven](https://youtu.be/8pPvNqOb6RA)

> Busbud's bot for all things fitness, including stair climbing and
bike riding achievements.

## Usage

### With [stdbot] (Flowdock example)

[stdbot]: https://github.com/stdbot/stdbot

```sh
npm install --save busbud/stairs stdbot stdbot-flowdock
```

```js
const FitnessBot = require('@busbud/stairs')
const Stdbot = require('stdbot')
const Flowdock = require('stdbot-flowdock')

FitnessBot({
  floors: process.env.STAIRS_FLOORS,
  floorHeight: process.env.STAIRS_FLOOR_HEIGHT,
  db: process.env.DATABASE_URL,
  adapter: Stdbot(Flowdock({
    flows: process.env.FLOWDOCK_FLOWS.split(','),
    token: process.env.FLOWDOCK_TOKEN
  }))
})
```

### With [Hubot]

[hubot]: https://hubot.github.com/

```sh
npm install --save busbud/stairs
```

Add a `scripts/fitness.js` like:

```js
const FitnessBot = require('@busbud/stairs')

const room = process.env.HUBOT_FITNESS_ROOM
const isRoom = room ? message => message.room === room : message => true

const fitnessBot = FitnessBot({
  floors: process.env.HUBOT_STAIRS_FLOORS,
  db: process.env.HUBOT_FITNESS_DB
})

module.exports = robot => {
  robot.listen(isRoom, res => {
    fitnessBot.onMessage({
      author: {
        id: res.message.user.id,
        name: res.message.user.name
      },
      text: res.message.text,
      thread: res.message.metadata && res.message.metadata.thread_id,
      send: res.send.bind(res),
      reply: res.reply.bind(res)
    })
  })
}
```
