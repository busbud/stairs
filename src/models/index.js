const user = require('./user')
const session = require('./session')
const run = require('./run')

module.exports = db => {
  const User = user(db)
  const Session = session(db, User)
  const Run = run(db, User, Session)

  return { User, Session, Run }
}
