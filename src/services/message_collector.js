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
const handler = require('../services/handler.js');
const interactive_cmds = [
  'arrest',
  'guilty',
  'approve_detainment',
  'grant_warrant_for_arrest',
  'detain',
  'request_lawyer'
];

async function is_cmd(msg) {
  const parsed = await handler.parseCommand(msg, config.prefix.length);

  return {
    is_command: msg.content.startsWith(config.prefix) && parsed.success,
    parsed
  };
}

module.exports = {
  collectors: new Map(),

  add(condition, callback, key, key_append, obj) {
    this.collectors.set(key, {
      callback,
      condition,
      key_append,
      ...obj
    });
  },

  async check(msg) {
    const second_key = msg.channel.guild ? msg.channel.guild.id : msg.channel.id;
    let existing_key = `${msg.author.id}-${second_key}`;

    for (const [key, val] of this.collectors) {
      existing_key += val.key_append ? `-${val.key_append}` : '';

      const exists = key === existing_key;
      const { parsed, is_command } = await is_cmd(msg);

      if (exists && is_command && interactive_cmds.includes(parsed.command.names[0])) {
        await val.cancel();
      }

      if (val.condition(msg)) {
        val.callback(msg);
        this.remove(key);
      }
    }
  },

  remove(key) {
    this.collectors.delete(key);
  }
};
