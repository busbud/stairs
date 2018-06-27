const pg = require('pg-promise')()

const bike = require('./bike.js')
const stairs = require('./stairs.js')
const overview = require('./overview.js')

class State {
  constructor (achievements, config, db) {
    this.achievements = achievements
    this.config = config
    this.db = db
  }
}

function FitnessBot (config) {
  const fitnessBot = {}
  const db = pg(config.db)
  let state

  function init () {
    return db.query('SELECT * FROM achievements ORDER BY height')
      .then(res => {
        state = new State(res, config, db)
      })
      .catch(onError)
  }

  function onError (err) {
    console.error(`${new Date()} ${err.stack || err}`)
  }

  function onMessage (message) {
    message = Object.assign({}, message, { words: message.text.split(/(?::|,|!|\.|\?)?(?: +|$)/) })
    const actions = []

    // Stairs Commands
    if (message.words.includes('#std')) {
      message.doneHash = '#std'
      actions.push(stairs.onStairsDone)
    }

    if (message.words.includes('#stairs-lead') || message.words.includes('#stairs-leaderboard')) {
      actions.push(stairs.onStairsLeaderboard)
    }

    if (message.words.includes('#stairs-achievements')) {
      actions.push(stairs.onStairsAchievements)
    }

    // Bike Commands
    if (message.words.includes('#btw')) {
      message.doneHash = '#btw'
      actions.push(bike.onBikeDone)
    }

    if (message.words.includes('#bike-lead') || message.words.includes('#bike-leaderboard')) {
      actions.push(bike.onBikeLeaderboard)
    }

    if (message.words.includes('#bike-achievements')) {
      actions.push(bike.onBikeAchievements)
    }

    // Overview Commands
    if (message.words.includes('#lead') || message.words.includes('#leaderboard')) {
      actions.push(overview.onOverviewLeaderboard)
    }
    if (message.words.includes('#help')) {
      actions.push(overview.onHelp)
    }


    return actions.reduce((promise, action) => promise.then(() => action(message, state)), Promise.resolve())
      .catch(onError)
  }

  if (!config.adapter) {
    // External adapter will push messages.
    fitnessBot.onMessage = onMessage
  } else {
    config.adapter.on('message', onMessage)
  }

  fitnessBot.end = () => {
    db.end()

    if (config.adapter) {
      config.adapter.end()
    }
  }

  init().then(() => {
    console.log('Started listening for messages')
    return fitnessBot
  })
}

module.exports = FitnessBot
