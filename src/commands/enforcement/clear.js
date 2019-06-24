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
const max = 500;

module.exports = new class Clear extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: '100',
          key: 'amount',
          type: 'int',
          name: 'amount'
        }),
        new Argument({
          example: 'Lexy',
          key: 'member',
          name: 'member',
          type: 'member',
          remainder: true
        })
      ],
      description: 'Clears a user\'s recent messages.',
      groupName: 'enforcement',
      names: ['clear']
    });
  }

  async run(msg, args) {
    if (args.amount <= 0 || args.amount > max) {
      return CommandResult.fromError('The amount to delete must be between 0 and 500.');
    }

    const {
      trial_role, jailed_role, imprisoned_role
    } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const { roles } = args.member;

    if (!roles.some(x => x === trial_role || x === jailed_role || x === imprisoned_role)) {
      return CommandResult.fromError('You can only clear a user\'s messages if they have the \
Trial role, Jailed role, or Imprisoned role.');
    }

    const pruned = await msg.channel.purge(args.amount, x => x.author.id === args.member.id);

    await discord.create_msg(
      msg.channel, `${pruned} messages sent by ${args.member.mention} have been deleted.`
    );
  }
}();
