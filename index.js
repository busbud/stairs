function Stairs (config) {
  const stairs = {}
  const sessions = {}

  function onStairs (message) {
    sessions[message.thread] = {}
  }

  function onDone (message) {
    if (!sessions[message.thread]) {
      return message.reply('There was no stairs session here!')
    }

    const number = message.words[message.words.indexOf('#done') + 1]
    const floors = number && number.match(/^\d+/) ? Number(number) : config.floors

    message.reply(`You did ${floors} floors!`)
  }

  function onMessage (message) {
    message = Object.assign({}, message, { words: message.text.split(/ +/) })

    if (message.words.includes('@team') && message.words.includes('#stairs')) {
      onStairs(message)
    }

    if (message.words.includes('#done')) {
      onDone(message)
    }
  }

  if (!config.adapter) {
    // External adapter will push messages.
    stairs.onMessage = onMessage
  } else {
    config.adapter.on('message', onMessage)
  }

  return stairs
}

module.exports = Stairs
