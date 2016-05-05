const Sequelize = require('sequelize')

module.exports = db => db.define('user', {
  id: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  meta: {
    type: Sequelize.JSONB
  }
})
