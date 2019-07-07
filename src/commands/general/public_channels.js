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
const { Command, CommandResult } = require('patron.js');
const db = require('../../services/database.js');
const client = require('../../services/client.js');
const discord = require('../../utilities/discord.js');
const string = require('../../utilities/string.js');

module.exports = new class PublicChannels extends Command {
  constructor() {
    super({
      description: 'View the server\'s public channels.',
      groupName: 'general',
      names: ['public_channels']
    });
  }

  async run(msg) {
    const channels = db
      .fetch_channels(msg.channel.guild.id)
      .filter(x => x.active === 1);

    if (!channels.length) {
      return CommandResult.fromError('There are no public channels.');
    }

    const names = [];

    for (let i = 0; i < channels.length; i++) {
      const { channel_id } = channels[i];
      const guild = client.guilds.get(client.channelGuildMap[channel_id]);
      const channel = guild.channels.get(channel_id);

      if (!channel) {
        continue;
      }

      names.push(channel.mention);
    }

    await discord.create_msg(msg.channel, {
      title: 'Public Channels', description: string.list(names)
    });
  }
}();
