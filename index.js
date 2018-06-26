const pg = require('pg-promise')()

const stairs = require('stairs')

class AppData {
  constructor(achievements, config, db) {
    this.achievements = achievements;
    this.config = config;
    this.db = db;
  }
}

function FitnessBot (config) {
  const fitnessBot = {}
  const db = pg(config.db)
  let appData;

  function init () {
    db.query('SELECT * FROM achievements ORDER BY height')
      .then(res => {
        appData = new AppData(res, config, db)
      })
      .catch(onError)
  }

  function onError (err) {
    console.error(`${new Date()} ${err.stack || err}`)
  }

  function onMessage (message) {
    message = Object.assign({}, message, { words: message.text.split(/(?::|,|!|\.|\?)?(?: +|$)/) })
    const actions = []

    if (message.words.includes('#std')) {
      message.doneHash = '#std'
      actions.push(stairs.onStairsDone)
    }

    if (message.words.includes('#lead') || message.words.includes('#leaderboard')) {
      actions.push(stairs.onStairsLeaderboard)
    }

    if (message.words.includes('#achievements')) {
      actions.push(stairs.onStairsAchievements)
    }

    return actions.reduce((promise, action) => promise.then(() => action(message, appData)), Promise.resolve())
      .catch(onError)
  }

  if (!config.adapter) {
    // External adapter will push messages.
    fitnessBot.onMessage = onMessage
  } else {
    config.adapter.on('message', onMessage)
  }

  init()

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
