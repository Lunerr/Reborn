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
const { config } = require('../services/data.js');
const db = require('../services/database.js');
const Timer = require('../utilities/timer.js');
const system = require('../utilities/system.js');
const discord = require('../utilities/discord.js');

Timer(async () => {
  await discord.loop_guilds(async guild => {
    if (!guild) {
      return;
    }

    const warrants = db.fetch_warrants(guild.id);

    for (let j = 0; j < warrants.length; j++) {
      const warrant = warrants[j];

      if (warrant.executed === 1) {
        continue;
      }

      const time_left = Date.now() - (warrant.created_at + config.auto_close_warrant);

      if (time_left < 0) {
        continue;
      }

      db.close_warrant(warrant.id);

      const { warrant_channel } = db.fetch('guilds', { guild_id: guild.id });
      const w_channel = guild.channels.get(warrant_channel);

      if (w_channel) {
        const new_warrant = Object.assign(warrant, { executed: 1 });

        return system.edit_warrant(w_channel, new_warrant);
      }
    }
  });
}, config.auto_close_warrant_interval);
