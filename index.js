const uuid = require('node-uuid')
const pg = require('pg-promise')()

const isDuplicate = err => err.code === '23505'

function Stairs (config) {
  const stairs = {}
  const sessions = {}
  const db = pg(config.db)

  let currentSessionId

  function onError (err) {
    console.error(`${new Date()} ${err.stack || err}`)
  }

  db.query('SELECT * FROM sessions ORDER by created_at DESC')
    .then(res => res[0])
    .then(session => {
      if (!session) {
        return
      }

      currentSessionId = session.id
      sessions[currentSessionId] = session
    })
    .catch(onError)

  function onStairs (message) {
    currentSessionId = String(message.thread || uuid.v4())

    console.log(`#stairs ${currentSessionId}`)

    return db.query('INSERT INTO sessions (id) VALUES ($1) RETURNING *', [currentSessionId])
      .then(res => res[0])
      .then(session => {
        sessions[currentSessionId] = session
      })
      .catch(err => {
        // Ignore if the session already existed.
        if (!isDuplicate(err)) {
          throw err
        }
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

    return db.query('INSERT INTO users (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = $2', [message.author.id, message.author.name])
      .then(() => db.query('INSERT INTO runs (user_id, session_id, floors) VALUES ($1, $2, $3)', [message.author.id, session.id, floors]))
      .then(() => message.tag('#gg'))
  }

  function onMessage (message) {
    message = Object.assign({}, message, { words: message.text.split(/(?::|,|!|\.|\?)?(?: +|$)/) })

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

  stairs.end = () => {
    db.end()

    if (config.adapter) {
      config.adapter.end()
    }
  }

  return stairs
}

module.exports = Stairs
