/**
 * Reborn - The core control of the only truly free and fair discord server.
 * Copyright (C) 2019 John Boyer
 *
 * Reborn is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Reborn is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
'use strict';
const client = require('../services/client.js');
const { config } = require('../services/data.js');
const chat = require('../services/chat.js');
const system = require('../utilities/system.js');
const number = require('../utilities/number.js');
const discord = require('../utilities/discord.js');
const db = require('../services/database.js');
const Timer = require('../utilities/timer.js');

Timer(async () => {
  await system.loop_guilds(async (guild, guild_id, x) => {
    if (x.giveaway_timer > Date.now() || x.giveaway_timer === 0) {
      return;
    }

    if (!guild) {
      return;
    }

    db.set_giveaway_timer(0, guild_id);

    const channel = await guild.channels.get(x.giveaway_channel);

    if (!channel) {
      return;
    }

    const entries = Object.values(chat.giveaway_entries);
    const sorted_entries = entries.sort((a, b) => a.count - b.count);
    const total_odds = sorted_entries.map(y => y.count)
      .reduce((accumulator, current_value) => accumulator + current_value);
    const roll = number.nextInt(1, total_odds);
    let cumulative = 0;
    let giveaway_winner;

    for (let i = 0; i < sorted_entries.length; i++) {
      const user = sorted_entries[i];

      cumulative += user.count;

      if (roll <= cumulative && !giveaway_winner) {
        giveaway_winner = user;
      }
    }

    const author = await client.users.get(giveaway_winner.author);

    discord.dm(author, `YOU'VE WON THE NITRO GIVEAWAY: ${x.giveaway_link.boldified}.`);
    await channel.createMessage(`@everyone ${author.mention} is the winner of the giveaway!`);
  });
}, config.auto_giveaway);
