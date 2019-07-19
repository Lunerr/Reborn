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

module.exports = {
  collectors: new Map(),

  add(condition, callback, key, obj) {
    this.collectors.set(key, {
      callback,
      condition,
      ...obj
    });
  },

  async check(msg) {
    for (const [key, val] of this.collectors) {
      const parsed = await handler.parseCommand(msg, config.prefix.length);
      const is_cmd = msg.content.startsWith(config.prefix) && parsed.success;

      if (is_cmd && interactive_cmds.includes(parsed.command.names[0])) {
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
