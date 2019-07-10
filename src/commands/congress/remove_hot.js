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
const { Argument, Command, CommandResult } = require('patron.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');

module.exports = new class RemoveHot extends Command {
  constructor() {
    super({
      preconditions: ['guild_db_exists'],
      args: [
        new Argument({
          example: 'johns genitals',
          key: 'name',
          name: 'name',
          type: 'string',
          remainder: true,
          preconditions: ['custom_command']
        })
      ],
      description: 'Removes a custom command.',
      groupName: 'congress',
      names: ['remove_hot', 'delete_hot']
    });
  }

  async run(msg, args) {
    const cmd = db
      .fetch_commands(msg.channel.guild.id)
      .find(x => x.name.toLowerCase() === args.name.toLowerCase() && x.active === 1);

    if (!cmd) {
      return CommandResult.fromError('This command does not exist.');
    } else if (cmd.active === 0) {
      return CommandResult.fromError('This command was already removed.');
    }

    db.close_command(cmd.id);
    await discord.create_msg(
      msg.channel, `${discord.tag(msg.author).boldified}, I've removed the custom command \
with the name ${args.name}.`
    );
  }
}();
