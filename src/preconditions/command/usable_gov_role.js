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
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const str = require('../../utilities/string.js');
const { Precondition, PreconditionResult } = require('patron.js');

module.exports = new class UsableGovRole extends Precondition {
  constructor() {
    super({ name: 'usable_gov_role' });
  }

  async run(cmd, msg, options) {
    const res = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const roles = options && options.roles ? options.roles : [];

    for (let i = 0; i < roles.length; i++) {
      const id = res[roles[i]];
      const role = msg.channel.guild.roles.get(id);
      const name = roles[i].split('_').slice(0, -1).map(str.to_uppercase);

      if (!id || !role) {
        return PreconditionResult.fromError(
          cmd, `The ${name.join(' ')} role needs to be set.`
        );
      } else if (!discord.usable_role(msg.channel.guild, role)) {
        return PreconditionResult.fromError(
          cmd, `The ${name.join(' ')} role is higher than me in hierarchy.`
        );
      }
    }

    return PreconditionResult.fromSuccess();
  }
}();
