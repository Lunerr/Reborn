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
  'detain'
];
const unique_cmds = ['request_lawyer', 'auto_lawyer'];

interactive_cmds.push(...unique_cmds);

async function is_cmd(msg) {
  const parsed = await handler.parseCommand(msg, config.prefix.length);

  return {
    is_command: msg.content.startsWith(config.prefix) && parsed.success,
    parsed
  };
}

module.exports = {
  collectors: new Map(),

  add(condition, callback, key, key_append, cmd_name, obj) {
    this.collectors.set(key, {
      callback,
      condition,
      key_append,
      cmd_name,
      ...obj
    });
  },

  async check(msg) {
    const g_id = msg.channel.guild ? msg.channel.guild.id : msg.channel.id;

    for (const [key, val] of this.collectors) {
      const existing_key = `${msg.author.id}-${g_id}${val.key_append ? `-${val.key_append}` : ''}`;
      const exists = key === existing_key;
      const { parsed, is_command } = await is_cmd(msg);
      const interactive = is_command && interactive_cmds.includes(parsed.command.names[0]);
      const interactive_unique = is_command && unique_cmds.includes(parsed.command.names[0]);
      const conflicting = (interactive && !interactive_unique)
        || (interactive_unique && val.cmd_name === parsed.command.names[0]);

      if (exists && conflicting) {
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
