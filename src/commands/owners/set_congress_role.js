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
const { Argument, Command } = require('patron.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');

module.exports = new class SetCongressRole extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: 'Coongress',
          key: 'role',
          name: 'role',
          type: 'role',
          preconditions: ['usable_role'],
          remainder: true
        })
      ],
      description: 'Sets the Congress role.',
      groupName: 'owners',
      names: ['set_congress_role', 'set_congress']
    });
  }

  async run(msg, args) {
    db.update_guild_properties(msg.channel.guild.id, { congress_role: args.role.id });
    await discord.create_msg(
      msg.channel,
      `${discord.tag(msg.author).boldified}, I have set the Congress role to ${args.role.mention}.`
    );
  }
}();
