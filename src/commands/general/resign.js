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
const { Command, CommandResult } = require('patron.js');
const client = require('../../services/client.js');
const db = require('../../services/database.js');
const catch_discord = require('../../utilities/catch_discord.js');
const discord = require('../../utilities/discord.js');
const system = require('../../utilities/system.js');
const edit_member = catch_discord(client.editGuildMember.bind(client));

module.exports = new class Resign extends Command {
  constructor() {
    super({
      description: 'Removes all government roles',
      groupName: 'general',
      names: ['resign']
    });
  }

  async run(msg) {
    const res = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const roles = system.gov_roles.concat(system.chief_roles).filter(
      x => res[x] && msg.channel.guild.roles.has(res[x]) && msg.member.roles.includes(res[x])
    );

    if (!roles.length) {
      return CommandResult.fromError('You don\'t have any government official roles.');
    }

    const copy = msg.member.roles.slice();

    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      const index = msg.member.roles.indexOf(res[role]);

      if (index !== -1) {
        copy.splice(index, 1);
      }
    }

    await edit_member(msg.channel.guild.id, msg.author.id, {
      roles: copy
    }, 'Resigned');
    await discord.create_msg(msg.channel, `${discord.tag(msg.author).boldified}, \
You have successfully resigned.`);
  }
}();
