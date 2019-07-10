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
const { Precondition, PreconditionResult } = require('patron.js');
const db = require('../../services/database.js');
const max = 10;

module.exports = new class MaxCustomCmds extends Precondition {
  constructor() {
    super({ name: 'max_custom_cmds' });
  }

  async run(cmd, msg) {
    const cmds = db.fetch_commands(msg.channel.guild.id);
    const author = cmds.filter(x => x.creator_id === msg.author.id && x.active === 1);

    if (author.length >= max) {
      return PreconditionResult.fromError(
        cmd, `You may only have a maximum of ${max} active custom commands.`
      );
    }

    return PreconditionResult.fromSuccess();
  }
}();
