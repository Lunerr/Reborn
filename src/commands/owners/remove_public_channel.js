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
const system = require('../../utilities/system.js');

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
    const result = system._existing_pub_channel(msg.channel.guild.id, args.channel);

    if (!result.existing) {
      return CommandResult.fromError(`${args.channel.mention} is not a public channel.`);
    }

    db.remove_channel(args.channel.id);
    await system._public_channel(msg, args.channel, 'removed');
  }
}();
