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
const { config } = require('../services/data.js');
const db = require('../services/database.js');
const Timer = require('../utilities/timer.js');

Timer(() => {
  const keys = [...client.guilds.keys()];

  for (let i = 0; i < keys.length; i++) {
    const guild = client.guilds.get(keys[i]);
    const warrants = db.fetch_warrants(guild.id);

    for (let j = 0; j < warrants.length; j++) {
      const warrant = warrants[j];

      if (warrant.executed === 1) {
        continue;
      }

      const time_left = Date.now() - (warrant.created_at + config.auto_close_warrant);

      if (time_left >= 0) {
        db.close_warrant(warrant.id);
      }
    }
  }
}, config.auto_close_warrant_interval);
