function isValidBotCommand (message, state) {
  const firstWord = message.words[0]
  const isMessageFromBot = message.author.name === state.config.botName
  const unauthorizedTargets = [message.author.name, state.config.botName]
  const firstWordIsValidTarget = firstWord.startsWith('@') && !unauthorizedTargets.includes(firstWord.slice(1))
  return firstWordIsValidTarget && isMessageFromBot
}

async function getUserByName (state, name) {
  const rows = await state.db.query('SELECT * FROM users WHERE name = $1', [name])
  if (rows.length !== 1) return null
  return rows[0]
}

async function getCommandTarget (message, state) {
  let commandTarget
  if (isValidBotCommand(message, state)) {
    const targetUserName = message.words[0].slice(1)
    commandTarget = await getUserByName(state, targetUserName)
  } else {
    commandTarget = {
      id: message.author.id,
      name: message.author.name
    }
    await state.db.query('INSERT INTO users (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = $2', [message.author.id, message.author.name])
  }
  return commandTarget
}

module.exports = {
  isValidBotCommand,
  getUserByName,
  getCommandTarget
}
