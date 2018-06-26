const Table = require('cli-table2')

function onStairsDone (message, db, config, achievements) {
  const number = message.words[message.words.indexOf(message.doneHash) + 1]
  const floors = number && number.match(/^\d+/) ? Number(number) : config.floors

  console.log(`#std ${message.author.name} ${floors}`)

  return db.query('INSERT INTO users (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = $2', [message.author.id, message.author.name])
    .then(() => db.query('INSERT INTO runs (user_id, floors) VALUES ($1, $2, $3)', [message.author.id, floors]))
    .then(() => message.tag('#gg'))
    .then(() => db.query('SELECT SUM(floors) AS total FROM runs'))
    .then(res => res[0].total * config.floorHeight)
    .then(total => {
      console.log(`#total ${total}`)
      return total
    })
    .then(total => achievements.find(({ height }) => height > (total - (floors * config.floorHeight)) && height <= total))
    .then(achievement => achievement && message.send(`@team, you just reached the ${achievement.name} (${achievement.location}), with a total of ${achievement.height} meters!`))
}

function onStairsLeaderboard (message, db) {
  return db.query(`
          WITH recent_users
            AS (
                  SELECT users.*
                    FROM users
                    JOIN runs
                      ON runs.user_id = users.id
                GROUP BY users.id
                  HAVING max(runs.created_at) > now() - interval '2 months'
               )
        SELECT recent_users.name,
               sum(floors) AS floors
          FROM runs
          JOIN recent_users
            ON recent_users.id = runs.user_id
         WHERE created_at > date_trunc('year', now())
      GROUP BY user_id, recent_users.name
      ORDER BY sum(floors) DESC
    `)
    .then(rows => {
      const table = new Table({
        head: ['#', 'name', 'floors'],
        style: { head: [], border: [] }
      })

      rows.forEach((row, rank) => table.push([rank + 1, row.name, row.floors]))
      return message.send('```\n' + table.toString() + '\n```')
    })
}

function onStairsAchievements (message, db, config, achievements) {
  return db.query('SELECT SUM(floors) AS total FROM runs')
    .then(res => res[0].total * config.floorHeight)
    .then(total => {
      const table = new Table({
        head: ['#', 'name', 'location', 'height'],
        style: { head: [], border: [] }
      })

      const next = achievements.find(({ height }) => height > total)
      const leftMeters = next.height - total
      const leftRuns = leftMeters / config.floorHeight / config.floors

      achievements.forEach(({ name, location, height }) => table.push([total >= height ? '✓' : '✗', name, location, `${height} meters`]))

      return Promise.all([
        message.send('```\n' + table.toString() + '\n```'),
        message.send(`${Math.round(leftRuns)} runs (${Math.round(leftMeters)} meters) left for next achievement (${next.name}).`)
      ])
    })
}

module.exports = {
  onStairsDone,
  onStairsLeaderboard,
  onStairsAchievements
}
