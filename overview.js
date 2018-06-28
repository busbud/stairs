const Table = require('cli-table2')

function _getPlaceholder () {
  return {
    name: '-',
    floors: '-',
    distance_km: '-'
  }
}

async function onOverviewLeaderboard (message, state) {
  const stairsRows = await state.db.query(`
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

  const bikeRows = await state.db.query(`
          WITH recent_users
            AS (
                  SELECT users.*
                    FROM users
                    JOIN bike_runs
                      ON bike_runs.user_id = users.id
                GROUP BY users.id
                  HAVING max(bike_runs.created_at) > now() - interval '2 months'
               )
        SELECT recent_users.name,
               sum(distance)::float / 1000 AS distance_km
          FROM bike_runs
          JOIN recent_users
            ON recent_users.id = bike_runs.user_id
         WHERE created_at > date_trunc('year', now())
      GROUP BY user_id, recent_users.name
      ORDER BY sum(distance) DESC
    `)

  const table = new Table({
    head: ['Stairs Rank', 'Name', 'Floors', '  ', 'Bike Rank', 'Name', 'Distance (km)'],
    style: { head: [], border: [] }
  })

  const maxRows = Math.max(stairsRows.length, bikeRows.length)

  for (let i = 0; i < maxRows; i++) {
    const stairsRow = stairsRows[i] || _getPlaceholder()
    const bikeRow = bikeRows[i] || _getPlaceholder()
    table.push([i + 1, stairsRow.name, stairsRow.floors, '  ', i + 1, bikeRow.name, bikeRow.distance_km])
  }

  await message.send('```\n' + table.toString() + '\n```')
}

async function onHelp (message, state) {
  const helpText = `Here's all the fitness commands:
* \`#std\`: records stairs session, stands for "stairs done" (${state.config.floors} by default)
* \`#std <floors>\`: records stairs session of specific amount of floors (e.g. \`#std 5\`)
* \`#stairs-lead\`: shows stairs leaderboard
* \`#stairs-achievements\`: shows stairs achievements
* \`#btw\`: records bike session, stands for "biked to work"
* \`#btw <distance>\`: records bike session of specific distance (e.g. \`#btw 6.2\`), the first time you do it will set as default
* \`#btw <distance> #save\`: records bike session and saves over previous default
* \`#bike-lead\`: shows bike leaderboard
* \`#bike-achievements\`: shows bike achievements
* \`#lead\`: shows company leaderboard
* \`#help\`: show this message`

  await message.send(helpText)
}

module.exports = {
  onOverviewLeaderboard,
  onHelp
}
