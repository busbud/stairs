const pg = require('pg-promise')()

const stairs = require('src/stairs')

function FitnessBot (config) {
  const fitnessBot = {}
  const db = pg(config.db)

  let achievements = []

  function onError (err) {
    console.error(`${new Date()} ${err.stack || err}`)
  }

  db.query('SELECT * FROM achievements ORDER BY height')
    .then(res => {
      achievements = res
    })
    .catch(onError)

  function onMessage (message) {
    message = Object.assign({}, message, { words: message.text.split(/(?::|,|!|\.|\?)?(?: +|$)/) })
    const actions = []

    if (message.words.includes('#std')) {
      message.doneHash = '#std'
      actions.push({function: stairs.onStairsDone, args: [db, config, achievements]})
    }

    if (message.words.includes('#lead') || message.words.includes('#leaderboard')) {
      actions.push({function: stairs.onStairsLeaderboard, args: [db]})
    }

    if (message.words.includes('#achievements')) {
      actions.push({function: stairs.onStairsAchievements, args: [db, config, achievements]})
    }

    return actions.reduce((promise, action) => promise.then(() => action.function(message, ...action.args)), Promise.resolve())
      .catch(onError)
  }

  if (!config.adapter) {
    // External adapter will push messages.
    fitnessBot.onMessage = onMessage
  } else {
    config.adapter.on('message', onMessage)
  }

  console.log('Started listening for messages')

  fitnessBot.end = () => {
    db.end()

    if (config.adapter) {
      config.adapter.end()
    }
  }

  return fitnessBot
}

module.exports = FitnessBot
