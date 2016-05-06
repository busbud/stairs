const Sequelize = require('sequelize')

module.exports = db => db.define('session', {
  id: {
    type: Sequelize.STRING,
    primaryKey: true
  }
})
