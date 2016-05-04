const Stairs = require('@busbud/stairs')

const room = process.env.HUBOT_STAIRS_ROOM
const isRoom = room ? message => message.room === room : message => true

const stairs = Stairs({
  floors: process.env.HUBOT_STAIRS_FLOORS,
  db: process.env.HUBOT_STAIRS_DB
})

module.exports = robot => {
  robot.listen(isRoom, res => {
    stairs.onMessage({
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
