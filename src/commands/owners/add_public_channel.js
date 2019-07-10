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
const send_bitfield = 2048;

module.exports = new class AddPublicChannel extends Command {
  constructor() {
    super({
      preconditions: ['guild_db_exists'],
      args: [
        new Argument({
          example: 'free',
          key: 'channel',
          name: 'channel',
          type: 'textchannel',
          remainder: true
        })
      ],
      description: 'Adds a public channel.',
      groupName: 'owners',
      names: ['add_public_channel']
    });
  }

  async run(msg, args) {
    const channels = db.fetch_channels(msg.channel.guild.id);
    const existing = channels.some(x => x.channel_id === args.channel.id && x.active === 1);

    if (existing) {
      return CommandResult.fromError('This channel is already a public channel');
    }

    const channel = {
      guild_id: msg.channel.guild.id,
      channel_id: args.channel.id
    };

    db.insert('public_channels', channel);
    await this.add_overwrites(msg.channel.guild, args.channel);
    await discord.create_msg(
      msg.channel, `${discord.tag(msg.author).boldified}, ${args.channel.mention} has \
been added as a public channel.`
    );
  }

  async add_overwrites(guild, channel) {
    const {
      trial_role, jailed_role, imprisoned_role
    } = db.fetch('guilds', { guild_id: guild.id });
    const roles = [trial_role, jailed_role, imprisoned_role]
      .filter(x => guild.roles.has(x));

    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];

      await channel.editPermission(role, 0, send_bitfield, 'role');
    }
  }
}();
