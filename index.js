const uuid = require('node-uuid')
const Sequelize = require('sequelize')
const models = require('./src/models')

function Stairs (config) {
  const stairs = {}
  const sessions = {}
  const db = new Sequelize(config.db)
  const { User, Session, Run } = models(db)

  let currentSessionId

  Session.find({
    order: [['createdAt', 'DESC']]
  })
    .then(session => {
      if (!session) {
        return
      }

      currentSessionId = session.id
      sessions[currentSessionId] = session
    })

  function onError (err) {
    console.error(`${new Date()} ${err.stack || err}`)
  }

  function onStairs (message) {
    currentSessionId = message.thread || uuid.v4()

    console.log(`#stairs ${currentSessionId}`)

    return Session.create({ id: currentSessionId })
      .then(session => {
        sessions[currentSessionId] = session
      })
  }

  function onDone (message) {
    const session = sessions[message.thread || currentSessionId]

    console.log(`#done ${message.author.name}`)

    if (!session) {
      return message.reply('There was no stairs session here!')
    }

    const number = message.words[message.words.indexOf('#done') + 1]
    const floors = number && number.match(/^\d+/) ? Number(number) : config.floors

    console.log(`#done ${session.id} ${message.author.name} ${floors}`)

    return User.upsert({
      id: message.author.id,
      name: message.author.name
    })
      .then(() => {
        return Run.create({
          floors,
          userId: message.author.id,
          sessionId: session.id
        })
      })
  }

  function onMessage (message) {
    message = Object.assign({}, message, { words: message.text.split(/(?::|,|!|\.|\?)? +/) })

    if (message.words.includes('#stairs')) {
      return onStairs(message)
        .catch(onError)
    }

    if (message.words.includes('#done')) {
      return onDone(message)
        .catch(onError)
    }

    return Promise.resolve()
  }

  if (!config.adapter) {
    // External adapter will push messages.
    stairs.onMessage = onMessage
  } else {
    config.adapter.on('message', onMessage)
  }

  console.log('Started listening for messages')

  stairs.create = () =>
    db.sync({ force: true })

  stairs.end = () => {
    db.close()

    if (config.adapter) {
      config.adapter.end()
    }
  }

  return stairs
}

module.exports = Stairs
