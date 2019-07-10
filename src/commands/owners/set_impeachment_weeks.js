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
const to_week = 6048e5;

module.exports = new class SetImpeachmentWeeks extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: '1',
          key: 'weeks',
          name: 'weeks',
          type: 'int'
        })
      ],
      description: 'Sets the impeachment time in weeks.',
      groupName: 'owners',
      names: ['set_impeachment_weeks', 'set_impeachment']
    });
  }

  async run(msg, args) {
    if (args.weeks < 0) {
      return CommandResult.fromError('The time in weeks cannot be less than 0.');
    }

    db.update('guilds', {
      guild_id: msg.channel.guild.id,
      impeachment_time: args.weeks * to_week
    });
    await discord.create_msg(
      msg.channel,
      `${discord.tag(msg.author).boldified}, I've set the impeachment weeks to ${args.weeks}.`
    );
  }
}();
