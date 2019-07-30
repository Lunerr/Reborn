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
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const reset_msg = 'Are you sure you want to reset the server?\n\n\
__**THIS ACTION IS IRREVERSIBLE AND WILL RESET ALL USER CASH**__\n\nReply with `yes` \
to continue or `no` to stop.';

module.exports = new class ResetServer extends Command {
  constructor() {
    super({
      preconditions: ['guild_db_exists'],
      description: 'Resets the servers economy.',
      groupName: 'owners',
      names: ['reset_server', 'wipe_server', 'delete_server']
    });
  }

  async run(msg) {
    const verified = await discord.verify_channel_msg(
      msg,
      msg.channel,
      reset_msg,
      null,
      x => x.author.id === msg.author.id
        && (x.content.toLowerCase() === 'yes' || x.content.toLowerCase() === 'no')
    ).then(x => x.promise);

    if (verified.conflicting) {
      return CommandResult.fromError('The previous command has been cancelled.');
    } else if (!verified.success) {
      return CommandResult.fromError('The command has been timed out.');
    }

    const content = verified.reply.content.toLowerCase();
    const prefix = `${discord.tag(msg.author).boldified}, `;

    if (content === 'no') {
      return discord.create_msg(msg.channel, `${prefix}The command has been cancelled.`);
    }

    db.reset_server(msg.channel.guild.id);
    await discord.create_msg(msg.channel, `${prefix}The server has been successfully wiped.`);
  }
}();
