const Stairs = require('../')

async function run () {
  const stairs = await Stairs({
    floors: 9,
    floorHeight: 1,
    db: 'postgres://localhost/stairs'
  })

  const foo = { id: '1', name: 'foo' }
  const bar = { id: '2', name: 'bar' }

  function send (message) {
    return stairs.onMessage(Object.assign({
      send: message => console.log(message),
      reply: message => Promise.resolve(message),
      react: text => console.log(text)
    }, message))
  }
  await send({
    author: foo,
    text: '#movember'
  })
  await send({
    author: foo,
    text: '#stairs 400'
  })
  await send({
    author: bar,
    text: '#stairs nn'
  })
  stairs.end()
}

run().then(() => process.exit())
