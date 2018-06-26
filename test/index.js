const Stairs = require('../');

const stairs = Stairs({
  floors: 9,
  db: 'postgres://localhost/stairs'
});

const foo = { id: '1', name: 'foo' };
const bar = { id: '2', name: 'bar' };

function send(message) {
  return stairs.onMessage(Object.assign({
    send: message => Promise.resolve(message),
    reply: message => Promise.resolve(message)
  }, message));
}

stairs.create()
  .then(() => send({
    author: foo,
    text: '@team, #stairs'
  }))
  .then(() => send({
    author: foo,
    text: '#done 4'
  }))
  .then(() => send({
    author: bar,
    text: '#done'
  }))
  .then(() => stairs.end());
