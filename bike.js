const Table = require('cli-table2')

const helpers = require('./helpers')


async function _getUserBikedToWorkDistance(state, userId) {
  const rows = await state.db.query('SELECT * FROM users WHERE id = $1', [userId + ''])
  if (rows.length !== 1) return null
  const user = rows[0]
  return user.biked_to_work_distance
}

async function _setUserBikedToWorkDistance(state, message, commandTarget, distanceMeters) {
  const userId = commandTarget.id
  await state.db.query('UPDATE users SET biked_to_work_distance = $1 WHERE id = $2', [distanceMeters, userId + ''])
  message.raw.tags.push('#bike-distance-saved')
}

async function _hasUserBikedToWorkBefore(state, userId) {
  const rows = await state.db.query('SELECT COUNT(*) FROM bike_runs WHERE user_id = $1', [userId + ''])
  return parseInt(rows[0].count, 10) > 0
}

async function _handleDistanceInputAbsentForBikeDone(message, state, commandTarget, hasBikedToWorkBefore) {
  if (hasBikedToWorkBefore) {
    // Regular ride
    return await _getUserBikedToWorkDistance(state, commandTarget.id)
  }
  // First ride
  await message.send('You haven\'t biked to work yet, please put the number of km you ride to work after the hashtag.')
  return null
}

async function _handleDistanceInputPresentForBikeDone(message, state, commandTarget, hasBikedToWorkBefore, distanceMeters) {
  if (!hasBikedToWorkBefore) {
    // First ride
    await _setUserBikedToWorkDistance(state, message, commandTarget, distanceMeters)
    await message.send('This is your first ride! Your input distance has been saved as your regular biking distance.')
  } else {
    // Irregular ride, or the user wishes to save his regular bike distance
    if (message.words.includes('#save')) {
      await _setUserBikedToWorkDistance(state, message, distanceMeters)
    }
  }
}

async function _getBikeDistanceMetersToSave(message, state, commandTarget, distanceKm) {
  const hasBikedToWorkBefore = await _hasUserBikedToWorkBefore(state, commandTarget.id)

  let distanceMeters;
  if (distanceKm === null) {
    // No input of distance. Either user's first ride or regular ride
    distanceMeters = await _handleDistanceInputAbsentForBikeDone(message, state, commandTarget, hasBikedToWorkBefore)
  } else {
    // Manual input of distance. Either user's first ride or irregular ride
    distanceMeters = distanceKm * 1000
    if (distanceMeters) await _handleDistanceInputPresentForBikeDone(message, state, hasBikedToWorkBefore, distanceMeters)
  }
  return distanceMeters
}

async function _saveBikeRun (message, state, commandTarget, distanceMeters) {
  if (!distanceMeters) {
    await message.tag('#no-distance-given')
  } else if (!commandTarget) {
    await message.send('Failed to register stairs')
  }
  else {
    // Save the run
    await state.db.query('INSERT INTO bike_runs (user_id, distance) VALUES ($1, $2)', [commandTarget.id, distanceMeters])
    await message.tag('#gg')
    const rows = await state.db.query('SELECT SUM(distance) AS total FROM bike_runs')
    const total = rows[0].total
    const achievement = state.achievements.find(({ height }) => height > (total - distanceMeters) && height <= total)
    if (achievement) {
      await message.send(`@team, you just reached the ${achievement.name} (${achievement.location}), with a total of ${achievement.height / 1000} km!`)
    }
  }
}

async function onBikeDone (message, state) {
  const number = message.words[message.words.indexOf(message.doneHash) + 1]
  const distanceKm = number && number.match(/^-?\d+/) ? Number(number) : null

  if (distanceKm && distanceKm < 0) {
    await message.send('Did you bike backwards?')
  } else {
    const commandTarget = await helpers.getCommandTarget(message, state);
    const distanceMeters = await _getBikeDistanceMetersToSave(message, state, commandTarget, distanceKm)
    await _saveBikeRun(message, state, commandTarget, distanceMeters)
  }
}

function onBikeLeaderboard (message, state) {
  return state.db.query(`
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
    .then(rows => {
      const table = new Table({
        head: ['Rank', 'Name', 'Distance (km)'],
        style: { head: [], border: [] }
      })

      rows.forEach((row, rank) => table.push([rank + 1, row.name, row.distance_km]))
      return message.send('```\n' + table.toString() + '\n```')
    })
}

function onBikeAchievements (message, state) {
  return state.db.query('SELECT SUM(distance) AS total FROM bike_runs')
    .then(res => res[0].total)
    .then(total => {
      const table = new Table({
        head: ['Rank', 'Name', 'Location', 'Distance (km)'],
        style: { head: [], border: [] }
      })

      const next = state.achievements.find(({ height }) => height > total)
      const nextAchievementIndex = state.achievements.indexOf(next)
      const maxIndex = state.achievements.length - 1
      const firstDisplayedAchievementIndex = Math.max(0, nextAchievementIndex - 5)
      const lastDisplayedAchievementIndex = Math.min(maxIndex, nextAchievementIndex + 5)

      const leftMeters = next.height - total
      const leftKm = leftMeters / 1000

      for(let i = 0; i < state.achievements.length; i++) {
        if (i >= firstDisplayedAchievementIndex && i <= lastDisplayedAchievementIndex) {
          const { name, location, height } = state.achievements[i]
          table.push([total >= height ? '✓' : '✗', name, location, `${height} meters`])
        }
      }

      return Promise.all([
        message.send('```\n' + table.toString() + '\n```'),
        message.send(`${leftKm} kilometers left for next achievement (${next.name}).`)
      ])
    })
}

module.exports = {
  onBikeDone,
  onBikeLeaderboard,
  onBikeAchievements
}
