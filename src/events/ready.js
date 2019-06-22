/**
 * Reborn - The core control of the only truly free and fair discord server.
 * Copyright (C) 2019  John Boyer
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';
const client = require('../services/client.js');
const log = require('../utilities/logger.js');
const { options } = require('../services/data.js');
const db = require('../services/database.js');
const system = require('../utilities/system.js');

async function update_laws() {
  const keys = [...client.guilds.keys()];

  for (let i = 0; i < keys.length; i++) {
    const guild = client.guilds.get(keys[i]);

    if (!guild) {
      continue;
    }

    const { law_channel } = db.fetch('guilds', { guild_id: guild.id });
    const channel = guild.channels.get(law_channel);

    if (!law_channel || !channel) {
      continue;
    }

    const laws = db.fetch_laws(guild.id).filter(x => x.active === 1);

    await system.update_laws(channel, laws);
  }
}

client.on('ready', async () => {
  client.editStatus(options.status);
  log.info('Ready!');
  await update_laws();
});
