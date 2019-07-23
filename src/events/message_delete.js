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
const chat = require('../services/chat.js');

client.on('messageDelete', async message => {
  const keys = Object.keys(chat.messages);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const obj = chat.messages[key];
    const index = obj.ids.indexOf(message.id);

    if (index === -1) {
      continue;
    }

    const [author_id, guild_id] = key.split('-');

    await chat.mutex.sync(`${author_id}-${guild_id}`, () => obj.ids.splice(index, 1));

    if (author_id && guild_id) {
      const member = client.guilds.get(guild_id).members.get(author_id);
      const amount = member ? chat.get_cpm(guild_id, member) : config.cash_per_msg;

      db.add_cash(author_id, guild_id, -amount);
    }
  }
});
