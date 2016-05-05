const uuid = require('node-uuid')
const Sequelize = require('sequelize')
const models = require('./src/models')

function Stairs (config) {
  const stairs = {}
  const sessions = {}
  const db = new Sequelize(config.db)
  const { User, Session, Run } = models(db)

  let currentThread

  function onError (err) {
    console.error(`${new Date()} ${err.stack || err}`)
  }

  function onStairs (message) {
    currentThread = message.thread || uuid.v4()

    return Session.create()
      .then(session => {
        sessions[currentThread] = session
      })
  }

  function onDone (message) {
    const session = sessions[message.thread || currentThread]

    if (!session) {
      return message.reply('There was no stairs session here!')
    }

    const number = message.words[message.words.indexOf('#done') + 1]
    const floors = number && number.match(/^\d+/) ? Number(number) : config.floors

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
    message = Object.assign({}, message, { words: message.text.split(/(?::|,)? +/) })

    if (message.words.includes('@team') && message.words.includes('#stairs')) {
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