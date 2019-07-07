/**
 * Reborn - The core control of the only truly free and fair discord server.
 * Copyright (C) 2019  John Boyer
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';
const { Argument, Command, CommandResult } = require('patron.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');

module.exports = new class RemovePublicChannel extends Command {
  constructor() {
    super({
      preconditions: ['guild_db_exists'],
      args: [
        new Argument({
          example: 'not free',
          key: 'channel',
          name: 'channel',
          type: 'textchannel',
          remainder: true
        })
      ],
      description: 'Removes a public channel.',
      groupName: 'owners',
      names: ['remove_public_channel']
    });
  }

  async run(msg, args) {
    const channels = db.fetch_channels(msg.channel.guild.id);
    const existing = channels.find(x => x.channel_id === args.channel.id);

    if (!existing) {
      return CommandResult.fromError(`${args.channel.mention} is not a public channel.`);
    } else if (existing.active === 0) {
      return CommandResult.fromError(
        `${args.channel.mention} was already removed as a public channel.`
      );
    }

    db.remove_channel(args.channel.id);
    await discord.create_msg(
      msg.channel, `${discord.tag(msg.author).boldified}, ${args.channel.mention} has been \
removed as a public channel.`
    );
  }
}();
