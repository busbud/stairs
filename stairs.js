const Table = require('cli-table2')

const helpers = require('./helpers')

const stepsPerFloor = 20
const stepsObjective = 100000
const movemberStart = '2018-11-07'

function formatSteps (steps) {
  return steps > 1000 ? `${Math.round(steps / 1000)}k` : steps
}

async function onStairsDone (message, state) {
  const number = message.words[message.words.indexOf(message.doneHash) + 1]
  const floors = number && number.match(/^\d+/) ? Number(number) : state.config.floors
  const commandTarget = await helpers.getCommandTarget(message, state)

  if (commandTarget) {
    await state.db.query('INSERT INTO runs (user_id, floors) VALUES ($1, $2)', [commandTarget.id, floors])
    await message.react('muscle')

    const res = await state.db.query(`SELECT SUM(floors) AS total FROM runs WHERE created_at > '${movemberStart}'`)

    const totalFloors = res[0].total || 0
    const totalSteps = totalFloors * stepsPerFloor
    const objectiveRatio = totalSteps / stepsObjective
    const objectivePercent = Math.floor(objectiveRatio * 100)
    const lowerDozen = objectivePercent - (objectivePercent % 10)
    const previousTotalSteps = totalSteps - (floors * stepsPerFloor)
    const previousObjectiveRatio = previousTotalSteps / stepsObjective
    const previousObjectivePercent = Math.floor(previousObjectiveRatio * 100)
    const previousLowerDozen = previousObjectivePercent - (previousObjectivePercent % 10)

    if (lowerDozen > previousLowerDozen) {
      await message.send(`@here, you're at ${formatSteps(totalSteps)} steps (${totalFloors} floors, ${objectivePercent}%) of movember ${formatSteps(stepsObjective)} steps objective!`)
    }

    // const res = await state.db.query('SELECT SUM(floors) AS total FROM runs')
    // const total = res[0].total * state.config.floorHeight
    // const achievement = state.achievements.find(({ height }) => height > (total - (floors * state.config.floorHeight)) && height <= total)
    // if (achievement) {
    //   await message.send(`@here, you just reached the ${achievement.name} (${achievement.location}), with a total of ${achievement.height} meters!`)
    // }
  } else {
    await message.send('Failed to register stairs')
  }
}

function getLastDayOfMonth () {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  date.setDate(0)
  return date.getDate()
}

async function onMovember (message, state) {
  const res = await state.db.query(`SELECT SUM(floors) AS total FROM runs WHERE created_at > '${movemberStart}'`)

  const totalFloors = res[0].total || 0
  const totalSteps = totalFloors * stepsPerFloor
  const objectiveRatio = totalSteps / stepsObjective
  const objectivePercent = Math.floor(objectiveRatio * 100)
  const dayOfMonth = new Date().getDate()
  const lastDayOfMonth = getLastDayOfMonth()
  const remainingDays = lastDayOfMonth - dayOfMonth
  const remainingSteps = stepsObjective - totalSteps
  const remainingStepsPerDay = remainingSteps / remainingDays
  const remainingRunsPerDay = remainingStepsPerDay / (stepsPerFloor * state.config.floors)
  const currentTotalRunsPerDay = totalFloors / state.config.foors / dayOfMonth
  const sorry = currentTotalRunsPerDay < remainingRunsPerDay ? ' (sorry)' : ''

  await message.send(`You're at ${formatSteps(totalSteps)} steps (${totalFloors} floors, ${objectivePercent}%) of movember ${formatSteps(stepsObjective)} steps objective!
You need an average of ${Math.round(remainingRunsPerDay)} climbs a day to reach the objective by the end of the month.
So far you did an average of ${Math.round(currentTotalRunsPerDay)}${sorry}.`)
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
               )
        SELECT recent_users.name,
               sum(floors) AS floors
          FROM runs
          JOIN recent_users
            ON recent_users.id = runs.user_id
         WHERE created_at > '${movemberStart}'
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

module.exports = {
  onStairsDone,
  onMovember,
  onStairsLeaderboard,
  onStairsAchievements
}
