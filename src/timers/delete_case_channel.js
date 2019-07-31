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
const catch_discord = require('../utilities/catch_discord.js');
const client = require('../services/client.js');
const { config } = require('../services/data.js');
const db = require('../services/database.js');
const Timer = require('../utilities/timer.js');
const verdict = require('../enums/verdict.js');
const system = require('../utilities/system.js');
const delete_channel = catch_discord(client.deleteChannel.bind(client));
const expiration = 864e5;

Timer(async () => {
  await system.loop_guild_verdicts(async (guild, _, x) => {
    if (x.verdict === verdict.pending) {
      return;
    }

    const time_left = x.last_modified_at + expiration - Date.now();

    if (time_left > 0 || !guild) {
      return;
    }

    const channel_case = db.get_case(x.case_id);
    const channel = guild.channels.get(channel_case.channel_id);

    if (channel && channel.id !== '600133826081193994') {
      delete_channel(channel.id, '24 hours since the verdict was delivered');
    }
  });
}, config.auto_verdict_time);
