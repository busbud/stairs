const Table = require('cli-table2')

const helpers = require('./helpers')

async function onStairsDone (message, state) {
  const parseFloors = (text) => {
    if (!text) return state.config.floors;
    if (text === 'nn') return 5;
    if (text.match(/^\d+/)) return Number(second_arg);
    return state.config.floors;
  }

  const second_arg = message.words[message.words.indexOf(message.doneHash) + 1]
  const floors = parseFloors(second_arg);
  const commandTarget = await helpers.getCommandTarget(message, state)

  if (commandTarget) {
    await state.db.query('INSERT INTO runs (user_id, floors) VALUES ($1, $2)', [commandTarget.id, floors])
    await message.react('muscle')

    const res = await state.db.query('SELECT SUM(floors) AS total FROM runs')
    const total = res[0].total * state.config.floorHeight
    const achievement = state.achievements.find(({ height }) => height > (total - (floors * state.config.floorHeight)) && height <= total)

    if (achievement) {
      await message.send(`@here, you just reached the ${achievement.name} (${achievement.location}), with a total of ${achievement.height} meters!`)
    }
  } else {
    await message.send('Failed to register stairs')
  }
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
        head: ['Rank', 'Name', 'Floors'],
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
        head: ['Rank', 'Name', 'Location', 'Height (m)'],
        style: { head: [], border: [] }
      })

      const next = state.achievements.find(({ height }) => height > total)
      const nextAchievementIndex = state.achievements.indexOf(next)
      const maxIndex = state.achievements.length - 1
      const firstDisplayedAchievementIndex = Math.max(0, nextAchievementIndex - 5)
      const lastDisplayedAchievementIndex = Math.min(maxIndex, nextAchievementIndex + 5)

      const leftMeters = next.height - total
      const leftRuns = leftMeters / state.config.floorHeight / state.config.floors

      for (let i = 0; i < state.achievements.length; i++) {
        if (i >= firstDisplayedAchievementIndex && i <= lastDisplayedAchievementIndex) {
          const { name, location, height } = state.achievements[i]
          table.push([total >= height ? '✓' : '✗', name, location, `${height} meters`])
        }
      }

      return Promise.all([
        message.send('```\n' + table.toString() + '\n```'),
        message.send(`${Math.ceil(leftRuns)} runs (${Math.round(leftMeters)} meters) left for next achievement (${next.name}).`)
      ])
    })
  }

  function onMovember (message, state ) {
    function kFormatter(num) {
      return num > 9999 ? (num/1000).toFixed(0) + 'k' : num
    }
    function pctFormatter(num) {
      if (num === 0) return num.toFixed(0)
      if (num < 1) return num.toFixed(2)
      if (num < 25) return num.toFixed(1)
      return num.toFixed(0)
    }
      
    return state.db.query('SELECT SUM(floors) AS total FROM runs')
      .then(res => Number(res[0].total))
      .then(floors_done => {
        const TARGET = 200 * 1000
        const steps_done = floors_done * 20
        const pct = 100 * steps_done / TARGET
        console.log({pct})
        
        const response = `You're at ${kFormatter(steps_done)} steps (${floors_done} floors), ${pctFormatter(pct)}% of movember 200k objective!`
        return message.send(response);
      })
}

module.exports = {
  onStairsDone,
  onStairsLeaderboard,
  onStairsAchievements,
  onMovember
}
