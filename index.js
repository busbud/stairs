const Table = require('cli-table2')
const uuid = require('node-uuid')
const pg = require('pg-promise')()

const isDuplicate = err => err.code === '23505'

function Stairs (config) {
  const stairs = {}
  const sessions = {}
  const db = pg(config.db)

  let currentSessionId
  let achievements = []

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

  db.query('SELECT * FROM achievements ORDER BY height')
    .then(res => achievements = res)
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

    const number = message.words[message.words.indexOf(message.doneHash) + 1]
    const floors = number && number.match(/^\d+/) ? Number(number) : config.floors

    console.log(`#done ${session.id} ${message.author.name} ${floors}`)

    return db.query('INSERT INTO users (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = $2', [message.author.id, message.author.name])
      .then(() => db.query('INSERT INTO runs (user_id, session_id, floors) VALUES ($1, $2, $3)', [message.author.id, session.id, floors]))
      .then(() => message.tag('#gg'))
      .then(() => db.query('SELECT SUM(floors) AS total FROM runs'))
      .then(res => res[0].total * config.floorHeight)
      .then(total => (console.log(`#total ${total}`), total))
      .then(total => achievements.find(({ height }) => height > (total - (floors * config.floorHeight)) && height <= total))
      .then(achievement => achievement && message.send(`@team, you just reached the ${achievement.name} (${achievement.location}), with a total of ${achievement.height} meters!`))
  }

  function onLeaderboard (message) {
    return db.query(`
        SELECT users.name,
               sum(floors) AS floors
          FROM runs
          JOIN users
            ON users.id = runs.user_id
      GROUP BY user_id, users.name
      ORDER BY sum(floors) DESC
    `)
      .then(rows => {
        const table = new Table({
          head: ['#', 'name', 'floors'],
          style: { head: [], border: [] }
        })

        rows.forEach((row, rank) => table.push([rank + 1, row.name, row.floors]))
        return message.send('```\n' + table.toString() + '\n```')
      })
  }

  function onAchievements (message) {
    return db.query('SELECT SUM(floors) AS total FROM runs')
      .then(res => res[0].total * config.floorHeight)
      .then(total => {
        const table = new Table({
          head: ['#', 'name', 'location', 'height'],
          style: { head: [], border: [] }
        })

        const next = achievements.find(({ height }) => height > total)
        const leftMeters = next.height - total
        const leftRuns = leftMeters / config.floorHeight / config.floors

        achievements.forEach(({ name, location, height }) => table.push([total >= height ? '✓' : '✗', name, location, `${height} meters`]))

        return Promise.all([
          message.send('```\n' + table.toString() + '\n```'),
          message.send(`${Math.round(leftRuns)} runs (${Math.round(leftMeters)} meters) left for next achievement (${next.name}).`)
        ])
      })
  }


  function onMessage (message) {
    message = Object.assign({}, message, { words: message.text.split(/(?::|,|!|\.|\?)?(?: +|$)/) })
    const actions = []

    if (message.words.includes('#stairs')) {
      actions.push(onStairs)
    }

    if (message.words.includes('#done')) {
      message.doneHash = '#done';
      actions.push(onDone)
    }

    if (message.words.includes('#std')) {
      message.doneHash = '#std';
      actions.push(onStairs)
      actions.push(onDone)
    }

    if (message.words.includes('#lead') || message.words.includes('#leaderboard')) {
      actions.push(onLeaderboard)
    }

    if (message.words.includes('#achievements')) {
      actions.push(onAchievements)
    }

    return actions.reduce((promise, action) => promise.then(() => action(message)), Promise.resolve())
      .catch(onError)
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
