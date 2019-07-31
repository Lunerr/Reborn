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
const system = require('../../utilities/system.js');

module.exports = new class SetWarrantsChannel extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: 'warrants',
          key: 'channel',
          name: 'textchannel',
          type: 'textchannel',
          remainder: true
        })
      ],
      description: 'Sets the Warrant channel.',
      groupName: 'owners',
      names: ['set_warrants_channel', 'set_warrant_channel']
    });
  }

  async run(msg, args) {
    db.update_guild_properties(msg.channel.guild.id, { warrant_channel: args.channel.id });
    await discord.create_msg(
      msg.channel, `${discord.tag(msg.author).boldified}, I have set the Warrant channel \
to ${args.channel.mention}.`
    );

    const warrants = db.fetch_warrants(msg.channel.guild.id);

    await system.update_warrants(args.channel, warrants);
  }
}();
