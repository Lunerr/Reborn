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
const db = require('../services/database.js');
const Timer = require('../utilities/timer.js');
const system = require('../utilities/system.js');

Timer(async () => {
  const guilds = [...client.guilds.keys()];

  for (let k = 0; k < guilds.length; k++) {
    const laws = db.fetch_laws(guilds[k]);
    let edited = false;

    for (let i = 0; i < laws.length; i++) {
      const law = laws[i];

      if (law.edited_at !== null && law.edited_at + config.law_in_effect - Date.now() <= 0) {
        db.close_law(law.id);
      }

      if (law.active === 0 || law.in_effect === 1) {
        continue;
      }

      if (!system.law_in_effect(law, config.law_in_effect)) {
        continue;
      }

      db.set_law_in_effect(law.id);
      edited = true;
    }

    if (!edited) {
      continue;
    }

    const guild = client.guilds.get(guilds[k]);

    if (!guild) {
      continue;
    }

    const { law_channel } = db.fetch('guilds', { guild_id: guild.id });
    const channel = guild.channels.get(law_channel);
    const fetched = db.fetch_laws(guild.id);

    if (channel) {
      await system.update_laws(channel, fetched);
    }
  }
}, config.active_law);
