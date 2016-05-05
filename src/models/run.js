const Sequelize = require('sequelize')

module.exports = (db, User, Session) => {
  const Run = db.define('run', {
    floors: {
      type: Sequelize.INTEGER,
      allowNull: false
    }
  })

  User.hasMany(Run)
  Run.belongsTo(User)

  Session.hasMany(Run)
  Run.belongsTo(Session)

  return Run
}
