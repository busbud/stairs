const Table = require('cli-table2')

function _getPlaceholder() {
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
    head: ['# stairs', 'name', 'floors', '# bike', 'name', 'distance in km'],
    style: { head: [], border: [] }
  })

  const maxRows = Math.max(stairsRows.length, bikeRows.length);
  for (let i = 0; i < maxRows; i++) {
    const stairsRow = stairsRows[i] || _getPlaceholder();
    const bikeRow = bikeRows[i] || _getPlaceholder();
    table.push([i + 1, stairsRow.name, stairsRow.floors, i + 1, bikeRow.name, bikeRow.distance_km])
  }
  await message.send('```\n' + table.toString() + '\n```')
}


module.exports = {
  onOverviewLeaderboard
}