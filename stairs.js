const Table = require('cli-table2')

function onStairsDone (message, state) {
  const number = message.words[message.words.indexOf(message.doneHash) + 1]
  const floors = number && number.match(/^\d+/) ? Number(number) : state.config.floors

  console.log(`#std ${message.author.name} ${floors}`)

  return state.db.query('INSERT INTO users (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = $2', [message.author.id, message.author.name])
    .then(() => state.db.query('INSERT INTO runs (user_id, floors) VALUES ($1, $2)', [message.author.id, floors]))
    .then(() => message.tag('#gg'))
    .then(() => state.db.query('SELECT SUM(floors) AS total FROM runs'))
    .then(res => res[0].total * state.config.floorHeight)
    .then(total => state.achievements.find(({ height }) => height > (total - (floors * state.config.floorHeight)) && height <= total))
    .then(achievement => achievement && message.send(`@team, you just reached the ${achievement.name} (${achievement.location}), with a total of ${achievement.height} meters!`))
}

function onStairsLeaderboard (message, state) {
  return state.db.query(`
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

function onStairsAchievements (message, state) {
  return state.db.query('SELECT SUM(floors) AS total FROM runs')
    .then(res => res[0].total * state.config.floorHeight)
    .then(total => {
      const table = new Table({
        head: ['#', 'name', 'location', 'height'],
        style: { head: [], border: [] }
      })

      const next = state.achievements.find(({ height }) => height > total)
      const leftMeters = next.height - total
      const leftRuns = leftMeters / state.config.floorHeight / state.config.floors

      state.achievements.forEach(({ name, location, height }) => table.push([total >= height ? '✓' : '✗', name, location, `${height} meters`]))

      return Promise.all([
        message.send('```\n' + table.toString() + '\n```'),
        message.send(`${Math.ceil(leftRuns)} runs (${Math.round(leftMeters)} meters) left for next achievement (${next.name}).`)
      ])
    })
}

module.exports = {
  onStairsDone,
  onStairsLeaderboard,
  onStairsAchievements
}