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
const { RequireAll } = require('patron.js');
const client = require('../services/client.js');
const log = require('../utilities/logger.js');
const { options } = require('../services/data.js');
const db = require('../services/database.js');
const system = require('../utilities/system.js');
const path = require('path');

async function update_channels() {
  const keys = [...client.guilds.keys()];

  for (let i = 0; i < keys.length; i++) {
    const guild = client.guilds.get(keys[i]);

    if (!guild) {
      continue;
    }

    const {
      law_channel, warrant_channel, case_channel
    } = db.fetch('guilds', { guild_id: guild.id });
    const l_channel = guild.channels.get(law_channel);
    const w_channel = guild.channels.get(warrant_channel);
    const c_channel = guild.channels.get(case_channel);

    if (!l_channel && !w_channel && !c_channel) {
      continue;
    }

    if (l_channel) {
      const laws = db.fetch_laws(guild.id).filter(x => x.active === 1);

      await system.update_laws(l_channel, laws);
    }

    if (w_channel) {
      const warrants = db.fetch_warrants(guild.id).sort((a, b) => a.created_at - b.created_at);

      await system.update_warrants(w_channel, warrants);
    }

    if (c_channel) {
      const cases = db.fetch_cases(guild.id).sort((a, b) => a.created_at - b.created_at);

      await system.update_cases(c_channel, cases);
    }
  }
}

client.on('ready', async () => {
  client.editChannelPermission('605944653648363565', '557874203437694986', 2048, 0, 'member');
  client.editStatus(options.status);
  log.info('Ready!');
  await update_channels();
  await RequireAll(path.join(__dirname, '..', '/timers/'));
});
